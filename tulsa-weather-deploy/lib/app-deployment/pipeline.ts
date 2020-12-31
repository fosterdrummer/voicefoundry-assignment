import * as cdk from '@aws-cdk/core';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import { ApiStackProps, ApiStack } from './api';
import { GitHubSourceAction, GitHubSourceActionProps } from '@aws-cdk/aws-codepipeline-actions';
import { cdkBuildSpec } from './cdk-buildspec';

type BuildProps = {
    sourceBuildSpec: cb.BuildSpec
    integrationTestSpec?: cb.BuildSpec
}

type FrontendBucketProps = {
    indexDocument: string,
    errorDocument?: string
}

export type AppDeploymentPipelineProps = {
    appName: string;
    appEnv: string;
    apiStackProps: Omit<ApiStackProps, 'apiName'>;
    frontendBucketProps: FrontendBucketProps;
    githubSourceProps: Omit<GitHubSourceActionProps, 'actionName' | 'output'>;
    cdkSubDirectory: string;
    frontendBuildProps: BuildProps;
    apiBuildProps: BuildProps;
}

export class AppDeploymentPipeline extends cdk.Stack{

    public readonly pipelineName: string
    public readonly apiStackName: string
    public readonly frontendBucketName: string
    public readonly artifactBucketName: string
    private appFullName: string

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps & cdk.StackProps){
        super(scope, id, props);

        const {
            appName,
            appEnv,
            apiStackProps,
            frontendBucketProps,
            githubSourceProps,
            cdkSubDirectory,
            frontendBuildProps,
            apiBuildProps
        } = props;

        this.appFullName = `${appName}-${appEnv}`
        this.pipelineName = this.appFullName + '-deploy-pipeline';
        this.frontendBucketName = this.appFullName + '-web';
        this.artifactBucketName = this.appFullName + '-artifacts';
        /**
         * The api gw stack that will be deployed using the pipeline below
         */
        const apiStack = new ApiStack(this, 'AppStack', {
            ...apiStackProps,
            apiName: this.appFullName
        })

        this.apiStackName = apiStack.stackName;
    
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: this.frontendBucketName,
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: frontendBucketProps.indexDocument,
            websiteErrorDocument: frontendBucketProps.errorDocument
        });


        /**
         * Used by the frontend build job to access the api
         * url through parameter store
         */
        const environmentWithApiUrlParameterName = {
            API_URL_PARAM_NAME: {
                value: apiStack.apiUrlParameterName
            }
        }

        /**
         * Used by the frontend test job
         */
        const environmentWithBucketUrl = {
            BUCKET_URL: {
                value: frontendBucket.bucketWebsiteUrl
            }
        }

        /**
         * Create a custom artifact bucket so we can clean it up later
         */
        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
            bucketName: this.artifactBucketName,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        
        const sourceCode = new cp.Artifact();
        const cloudAssembly = new cp.Artifact();
        const frontendRelease = new cp.Artifact();
        const apiRelease = new cp.Artifact();

        const pipeline = new cp.Pipeline(this, 'DeployPipeline', {
            pipelineName: this.pipelineName,
            restartExecutionOnUpdate: false,
            artifactBucket: artifactBucket,
            stages: [{
                stageName: 'CheckoutSource',
                actions: [
                    new GitHubSourceAction({
                        actionName: 'CheckoutSource',
                        ...githubSourceProps,
                        output: sourceCode
                    })
                ]
            }]
        });

        /**
         * Compile the api source code and cloud assembly
         */
        pipeline.addStage({
            stageName: 'BuildApiAndCloudAssembly',
            actions: [
                this.getBuildAction({
                    actionName: 'BuildApiRelease',
                    buildProjectName: 'build-api-source',
                    buildSpec: frontendBuildProps.sourceBuildSpec,
                    input: sourceCode,
                    outputs: [apiRelease]
                }),
                this.getBuildAction({
                    actionName: 'BuildCloudAssembly',
                    buildProjectName: 'build-cloud-assembly',
                    buildSpec: cdkBuildSpec({
                        cdkProjectRoot: cdkSubDirectory,
                        deployCommands: ['npm run cdk synth'],
                        stackArtifacts: [apiStack.stackName]
                    }),
                    input: sourceCode,
                    outputs: [cloudAssembly]
                })
            ]
        });


        /**
         * Deploy the app resources and test the api
         */
        const deployCdkAppAction = new cpActions.CloudFormationCreateUpdateStackAction({
            actionName: 'DeployCdkApp',
            stackName: apiStack.stackName,
            templatePath: cloudAssembly.atPath(`${apiStack.stackName}.template.json`),
            adminPermissions: true,
            parameterOverrides: {
                ...apiStack.lambdaCodeFromParams.assign(apiRelease.s3Location)
            },
            extraInputs: [apiRelease]
        });

        const apiDeployStage = pipeline.addStage({ stageName: 'DeployApi' });
        apiDeployStage.addAction(deployCdkAppAction);

        /**
         * The deployApiAction attaches a restricted role to the api stack.
         * We need to add more access to this role in order to delete the stack later
         */
        deployCdkAppAction.deploymentRole.addManagedPolicy(iam.ManagedPolicy
            .fromAwsManagedPolicyName('AdministratorAccess'))

        if(apiBuildProps.integrationTestSpec){
            apiDeployStage.addAction(this.getBuildAction({
                actionName: 'TestApi',
                buildProjectName: 'test-api',
                buildSpec: apiBuildProps.integrationTestSpec,
                input: sourceCode,
                runOrder: 2,
                environmentVariables: environmentWithApiUrlParameterName
            }));
        }

        /**
         * Build, deploy, and test the frontend app
         */
        pipeline.addStage({
            stageName: 'BuildFrontend',
            actions: [
                this.getBuildAction({
                    actionName: 'BuildFrontEnd',
                    buildProjectName: 'build-frontend',
                    buildSpec: frontendBuildProps.sourceBuildSpec,
                    input: sourceCode,
                    outputs: [frontendRelease],
                    environmentVariables: environmentWithApiUrlParameterName
                })
            ] 
        });

        const frontendDeployStage = pipeline.addStage({
            stageName: 'DeployFrontend',
            actions: [
                new cpActions.S3DeployAction({
                    actionName: 'DeployToS3',
                    bucket: frontendBucket,
                    input: frontendRelease
                })
            ]
        });

        if(apiBuildProps.integrationTestSpec){
            frontendDeployStage.addAction(this.getBuildAction({
                actionName: 'TestFrontend',
                buildProjectName: 'test-frontend',
                buildSpec: apiBuildProps.integrationTestSpec,
                input: sourceCode,
                runOrder: 2,
                environmentVariables: environmentWithBucketUrl
            }));
        }
    }

    /**
     * 
     * A helper function to simply the creation of pipeline projects and their
     * corresponding actions.
     * 
     * @param props Props needed to initialize a pipeline project
     * and add it to a CodeBuild action.
     */
    getBuildAction(props: {
        actionName: string,
        buildProjectName: string,
        buildSpec: cb.BuildSpec,
        allowOutBound?: boolean,
        accessPolicyStatement?: iam.PolicyStatement,
        environmentVariables?: any,
        input: cp.Artifact,
        outputs?: cp.Artifact[],
        runOrder?: number
    }){

        const {
            actionName,
            buildProjectName,
            buildSpec,
            allowOutBound,
            accessPolicyStatement,
            environmentVariables,
            input,
            outputs,
            runOrder
        } = props;

        const project = new cb.PipelineProject(this, `BuildProject-${buildProjectName}`, {
            projectName: `${this.appFullName}-${buildProjectName}`,
            buildSpec: buildSpec,
            environment: {
                privileged: true,
                buildImage: cb.LinuxBuildImage.STANDARD_4_0
            },
            allowAllOutbound: allowOutBound,
            environmentVariables: environmentVariables,
            cache: cb.Cache.local(cb.LocalCacheMode.DOCKER_LAYER)
        });
        
        accessPolicyStatement && project.addToRolePolicy(accessPolicyStatement);

        return new cpActions.CodeBuildAction({
            actionName: actionName,
            project: project,
            input: input,
            outputs: outputs,
            runOrder: runOrder
        });
    }
}