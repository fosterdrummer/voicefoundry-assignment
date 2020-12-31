import * as cdk from '@aws-cdk/core';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import { AppStackProps, ApiStack } from './api';
import { FrontendStackProps, FrontendStack } from './frontend'
import { GitHubSourceAction, GitHubSourceActionProps } from '@aws-cdk/aws-codepipeline-actions';
import { cdkBuildSpec } from './cdk-buildspec';

type BuildProps = {
    sourceBuildSpec: cb.BuildSpec
    integrationTestSpec?: cb.BuildSpec
}

export interface AppDeploymentPipelineProps extends cdk.ResourceProps{
    appProps: AppStackProps & FrontendStackProps;
    
    appEnv: string;
    githubSourceProps: Omit<GitHubSourceActionProps, 'actionName' | 'output'>;
    cdkSubDirectory: string;
    frontendBuildProps: BuildProps;
    apiBuildProps: BuildProps;
    
}

export class AppDeploymentPipeline extends cdk.Resource{

    public readonly pipeline: cp.Pipeline
    private appFullName: string

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps){
        super(scope, id);

        this.appFullName = `${props.appProps.appName}-${props.appEnv}`

        /**
         * The stack that will be deployed using the pipeline below
         */
        const appStack = new ApiStack(this, 'AppStack', {
            ...props.appProps,
            appName: this.appFullName
        });

        const frontendStack = new FrontendStack(this, 'FrontendStack', {
            ...props.appProps,
            appName: this.appFullName
        })

        /**
         * The environment below will allow code build jobs to access relevant
         * bucket and api urls through parameter store
         */
        const environmentWithApiUrlParameterName = {
            API_URL_PARAM_NAME: {
                value: appStack.apiUrlParameterName
            }
        }

        const environmentWithBucketUrlParameterName = {
            BUCKET_URL_PARAM_NAME: {
                value: 'test'
            }
        }

        const allowParameterStoreAccess = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ssm:GetParameters'
            ],
            resources: [`arn:aws:ssm:${this.env.region}:${this.env.account}:*`]
        });

        /**
         * Create a custom artifact bucket so we can clean it up later
         */
        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
            bucketName: `${this.appFullName}-artifact-bucket`,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        
        const sourceCode = new cp.Artifact();
        const cloudAssembly = new cp.Artifact();
        const frontendRelease = new cp.Artifact();
        const apiRelease = new cp.Artifact();

        this.pipeline = new cp.Pipeline(this, 'DeployPipeline', {
            pipelineName: `${this.appFullName}-deploy-pipeline`,
            restartExecutionOnUpdate: false,
            artifactBucket: artifactBucket,
            stages: [{
                stageName: 'CheckoutSource',
                actions: [
                    new GitHubSourceAction({
                        actionName: 'CheckoutSource',
                        ...props.githubSourceProps,
                        output: sourceCode
                    })
                ]
            }]
        });

        /**
         * Compile the api source code and cloud assembly
         */
        this.pipeline.addStage({
            stageName: 'BuildApiAndCloudAssembly',
            actions: [
                this.getBuildAction({
                    actionName: 'BuildApiRelease',
                    buildProjectName: 'build-api-source',
                    buildSpec: props.apiBuildProps.sourceBuildSpec,
                    input: sourceCode,
                    outputs: [apiRelease]
                }),
                this.getBuildAction({
                    actionName: 'BuildCloudAssembly',
                    buildProjectName: 'build-cloud-assembly',
                    buildSpec: cdkBuildSpec({
                        cdkProjectRoot: props.cdkSubDirectory,
                        deployCommands: ['npm run cdk synth'],
                        stackArtifacts: [
                            appStack.stackName,
                            frontendStack.stackName
                        ]
                    }),
                    input: sourceCode,
                    outputs: [cloudAssembly]
                })
            ]
        });

        /**
         * Deploy and test the api
         */
        const deployApiAction = new cpActions.CloudFormationCreateUpdateStackAction({
            actionName: 'DeployApiStack',
            stackName: appStack.appName,
            templatePath: cloudAssembly.atPath(`${appStack.stackName}.template.json`),
            adminPermissions: true,
            parameterOverrides: {
                ...appStack.lambdaCodeFromParams.assign(apiRelease.s3Location)
            },
            extraInputs: [apiRelease]
        });

        const apiDeployStage = this.pipeline.addStage({ stageName: 'DeployApi' });
        apiDeployStage.addAction(deployApiAction);

        /**
         * The deployApiAction attaches a restricted role to the api stack.
         * We need to add more access to this role in order to delete the stack later
         */
        deployApiAction.deploymentRole.addManagedPolicy(iam.ManagedPolicy
            .fromAwsManagedPolicyName('AdministratorAccess'))

        if(props.apiBuildProps.integrationTestSpec){
            apiDeployStage.addAction(this.getBuildAction({
                actionName: 'TestApi',
                buildProjectName: 'test-api',
                buildSpec: props.apiBuildProps.integrationTestSpec,
                input: sourceCode,
                runOrder: 2,
                environmentVariables: environmentWithApiUrlParameterName,
                accessPolicyStatement: allowParameterStoreAccess
            }));
        }

        /**
         * Build, deploy, and test the frontend app
         */
        this.pipeline.addStage({
            stageName: 'BuildFrontend',
            actions: [
                this.getBuildAction({
                    actionName: 'BuildFrontEnd',
                    buildProjectName: 'build-frontend',
                    buildSpec: props.frontendBuildProps.sourceBuildSpec,
                    input: sourceCode,
                    outputs: [frontendRelease],
                    environmentVariables: environmentWithApiUrlParameterName,
                    accessPolicyStatement: allowParameterStoreAccess
                })
            ] 
        });

        /**
         * Deploy and test the api
         */
        const deployFrontendAction = new cpActions.CloudFormationCreateUpdateStackAction({
            actionName: 'DeployFrontendStack',
            stackName: frontendStack.appName,
            templatePath: cloudAssembly.atPath(`${frontendStack.stackName}.template.json`),
            adminPermissions: true,
            parameterOverrides: {
                ...frontendStack.frontEndDeploymentParams.assign(frontendRelease.s3Location)
            },
            extraInputs: [frontendRelease]
        });

        const frontendDeployStage = this.pipeline.addStage({ stageName: 'DeployFrontend' });
        frontendDeployStage.addAction(deployFrontendAction);

        deployFrontendAction.deploymentRole.addManagedPolicy(iam.ManagedPolicy
            .fromAwsManagedPolicyName('AdministratorAccess'))

        if(props.apiBuildProps.integrationTestSpec){
            frontendDeployStage.addAction(this.getBuildAction({
                actionName: 'TestFrontend',
                buildProjectName: 'test-frontend',
                buildSpec: props.apiBuildProps.integrationTestSpec,
                input: sourceCode,
                runOrder: 2,
                environmentVariables: environmentWithBucketUrlParameterName,
                accessPolicyStatement: allowParameterStoreAccess
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