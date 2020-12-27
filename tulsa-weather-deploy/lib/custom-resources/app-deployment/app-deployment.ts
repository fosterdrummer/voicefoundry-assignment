import * as cdk from '@aws-cdk/core';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as cr from '@aws-cdk/custom-resources';
import { ApiHandlerProps, LambdaApiStage } from './api';
import { generateAppDeploymentBuildAction } from './app-deployment-build-action';
import * as path from 'path';

/*
    Some helper types and methods to manage sourceCode and release artifacts
*/
type ProjectArtifacts = {codeSource?: cp.Artifact, release: cp.Artifact}

type PipelineArtifacts = {
    cdk: ProjectArtifacts, 
    frontEnd: ProjectArtifacts, 
    api: ProjectArtifacts
}

const getBuildAndReleaseArtifacts = function(sourceCheck: any): ProjectArtifacts{
    return {
        codeSource: sourceCheck && new cp.Artifact(),
        release: new cp.Artifact()
    }
}

/*
    Props needed for frontend and api deployments
*/
type GenericDeploymentProps = {
    /*
        Provides a source action to fetch an component's source code
    */
    sourceProvider?(output: cp.Artifact): cpActions.Action
    /*
        A buildspec to be configured in the codebuild projects
    */
    readonly sourceBuildSpec: cb.BuildSpec
}

/*
    Props needed to deploy the frontend app to S3
*/
export interface FrontEndDeploymentProps extends GenericDeploymentProps{
    /*
        Exposes the website bucket after creation
    */
    webBucketCreationCallback?(bucket: s3.Bucket): void
    /*
        The entry point to the app hosted on an s3 bucket (ex. index.html)
    */
    appIndex: string
}

/*
    Props needed to deploy the lambda api gw project
*/
export interface ApiDeploymentProps extends GenericDeploymentProps{
    /*
        Exposes the handler and api after creation
    */
    apiCreationCallback?(handler: lambda.Function, api: apiGw.LambdaRestApi): void
    /*
        Allow clients to configure all function settings EXCEPT the code source
    */
    handlerProps: ApiHandlerProps
}

/*
    Props needed for the deployment
*/
export interface AppDeploymentProps extends cdk.ResourceProps{
    /*
        The stage name of this deployment (ex. dev, test, prod)
    */
    readonly stageName: string
    /*
        Name of the app to be deployed
    */
    readonly appName: string
    /*
        Repo relative path to the current cdk project.
        This context is necessary for the buildspec to synth the api stack
        at the proper location.
    */
    readonly cdkProjectRoot?: string
    /*
        Provides a source action to retrieve the cdk project's source code
    */
    cdkSourceProvider(output: cp.Artifact): cpActions.Action
    readonly frontEndProps: FrontEndDeploymentProps
    readonly apiProps: ApiDeploymentProps
}
/*
    Executes a deployment consisting of a frontend app hosted on S3
    and a lambda service proxied through api gateway
*/
export class AppDeployment extends cdk.Resource{

    public readonly pipeline: cp.Pipeline
    protected readonly apiStackName: string
    protected readonly projectRoot?: string

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentProps){
        super(scope, id, props);

        const nameWithContext = (name: string): string => 
            `${props.appName.toLocaleLowerCase()}-${name}-${props.stageName}`

        this.projectRoot = props.cdkProjectRoot

        const apiStage = new LambdaApiStage(this, 'LambdaApiStage', {
            serviceName: nameWithContext('api'),
            apiCreationCallback: props.apiProps.apiCreationCallback,
            handlerProps: props.apiProps.handlerProps
        });

        this.apiStackName = apiStage.stackName

        const frontEndStageBucket = new s3.Bucket(this, 'HostBucket', {
            bucketName: nameWithContext('web'),
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: props.frontEndProps.appIndex
        });
        
        const artifacts: PipelineArtifacts = {
            cdk: getBuildAndReleaseArtifacts(true),
            api: getBuildAndReleaseArtifacts(props.apiProps.sourceProvider),
            frontEnd: getBuildAndReleaseArtifacts(props.apiProps.sourceProvider)
        }

        artifacts.cdk.codeSource = artifacts.cdk.codeSource as cp.Artifact
        
        const sourceActions = [props.cdkSourceProvider(artifacts.cdk.codeSource)];
        props.apiProps.sourceProvider && 
        sourceActions.push(props.apiProps.sourceProvider(artifacts.api.codeSource as cp.Artifact));    
        props.frontEndProps.sourceProvider &&
        sourceActions.push(props.frontEndProps.sourceProvider(artifacts.frontEnd.codeSource as cp.Artifact));

        const deployPipelineName = nameWithContext('deploy-pipeline');

        this.pipeline = new cp.Pipeline(this, 'DeployPipeline', {
            pipelineName: deployPipelineName,
            stages: [{
                stageName: 'Source',
                actions: sourceActions
            }, {
                stageName: 'BuildApi',
                actions: [
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildApiRelease',
                        buildProjectName: nameWithContext('api-source-build'),
                        buildSpec: props.apiProps.sourceBuildSpec,
                        input: artifacts.api.codeSource || artifacts.cdk.codeSource,
                        outputs: [artifacts.api.release]
                    }),
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildApiCfn',
                        buildProjectName: nameWithContext('api-cfn-build'),
                        buildSpec: this.getCdkBuildSpec(),
                        input: artifacts.cdk.codeSource,
                        outputs: [artifacts.cdk.release]
                    })
                ]
            }, {
                stageName: 'DeployApi',
                actions: [
                    new cpActions.CloudFormationCreateUpdateStackAction({
                        actionName: 'DeployCfnApiRelease',
                        stackName: nameWithContext('api'),
                        templatePath: artifacts.cdk.release
                            .atPath(`${apiStage.stackName}.template.json`),
                        adminPermissions: true,
                        parameterOverrides: {
                            ...apiStage.lambdaCodeFromParams.assign(artifacts.api.release.s3Location)
                        },
                        extraInputs: [artifacts.api.release]
                    })
                ]
            },{
                stageName: 'BuildFrontend',
                actions: [
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildFrontEnd',
                        buildProjectName: nameWithContext('frontend-build'),
                        buildSpec: props.frontEndProps.sourceBuildSpec,
                        environmentVariables: {
                            API_URL: {
                                value: apiStage.apiUrlParameterName
                            }
                        },
                        input: artifacts.frontEnd.codeSource || artifacts.cdk.codeSource,
                        outputs: [artifacts.frontEnd.release]
                    })
                ] 
            }, {
                stageName: 'DeployFrontend',
                actions: [
                    new cpActions.S3DeployAction({
                        actionName: 'DeployToS3',
                        bucket: frontEndStageBucket,
                        input: artifacts.frontEnd.release
                    })
                ]
            }]
        });
        this.pipeline.role.addManagedPolicy(iam.ManagedPolicy
                .fromAwsManagedPolicyName('AdministratorAccess'));
                
        const standardLambdaConfig = {
            code: lambda.Code.fromAsset('custom-resource-handlers/app-deployment'),
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                REGION: this.env.region
            }
        }

        const onEventHandler = new lambda.SingletonFunction(this, 'OnEventHandler', {
            uuid: 'app-deployment-custom-resource-onevent-handler',
            handler: 'build/on-event.handler',
            ...standardLambdaConfig
        });
        
        const isCompleteHandler = new lambda.SingletonFunction(this, 'IsCompleteHandler', {
            uuid: 'app-deployment-custom-resource-iscomplete-handler',
            handler: 'build/is-complete.handler',
            ...standardLambdaConfig
        });

        const allowPipelineAccess = iam.PolicyStatement.fromJson({
            "Sid": "allowPipelineAccess",
            "Effect": "Allow",
            "Action": [
                "codepipeline:StartPipelineExecution",
                "codepipeline:GetPipelineExecution",
                "codepipeline:ListPipelineExecutions"
            ],
            "Resource": this.pipeline.pipelineArn
        });

        const allowCfnAccess = iam.PolicyStatement.fromJson({
            "Sid": "allowCfnAccess",
            "Effect": "Allow",
            "Action": [
                "cloudformation:DeleteStack",
                "cloudformation:DescribeStacks"
            ],
            "Resource": `arn:aws:cloudformation:${this.env.region}:${this.env.account}:stack/${apiStage.stackName}/*`
        })

        onEventHandler.addToRolePolicy(allowPipelineAccess);
        onEventHandler.addToRolePolicy(allowCfnAccess);
        isCompleteHandler.addToRolePolicy(allowPipelineAccess);
        isCompleteHandler.addToRolePolicy(allowCfnAccess);
        frontEndStageBucket.grantDelete(onEventHandler);
        frontEndStageBucket.grantRead(onEventHandler);
        
        const provider = new cr.Provider(this, 'AppDeploymentCustomResourceProvider', {
            onEventHandler: onEventHandler,
            isCompleteHandler: isCompleteHandler
        })
        /*
        new cdk.CustomResource(this, 'AppDeploymentCustomResource', {
            serviceToken: provider.serviceToken,
            properties: {
                codePipelineName: this.pipeline.pipelineName,
                bucketName: frontEndStageBucket.bucketName,
                bucketUrl: frontEndStageBucket.bucketWebsiteUrl,
                apiStackName: apiStage.stackName
            }
        });
        */
    }

    getCdkBuildSpec(): cb.BuildSpec {
        const installCommands = ['npm install']
        const buildCommands = [`npm run cdk synth -- ${this.apiStackName}`]
        const switchDirCommnad = this.projectRoot && 'cd ${CODEBUILD_SRC_DIR}/' + this.projectRoot
        if(switchDirCommnad){
            installCommands.unshift(switchDirCommnad);
            buildCommands.unshift(switchDirCommnad);
        }
        const artifactContext = this.projectRoot ? `/${this.projectRoot}/cdk.out`: '';
        const baseDir = '${CODEBUILD_SRC_DIR}' + artifactContext;
        const artifactFile = `${this.apiStackName}.template.json`;
        return cb.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    runtime_versions: { nodejs: 12 },
                    commands: installCommands
                },
                build: { commands: buildCommands }
            },
            artifacts: { 
                'base-directory': baseDir,
                files: [artifactFile] 
            }
        });
    }
}