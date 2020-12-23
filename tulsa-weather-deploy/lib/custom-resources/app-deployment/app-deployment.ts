import * as cdk from '@aws-cdk/core';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import { ApiHandlerProps, LambdaApiStage } from './api';
import { generateAppDeploymentBuildAction } from './app-deployment-build-action'

const getBuildAndReleaseArtifacts = function(){
    return {
        source: new cp.Artifact(),
        release: new cp.Artifact()
    }
}

type GenericDeploymentProps = {
    useCdkSourceProvider: boolean
    sourceProvider?(output: cp.Artifact): cpActions.Action
    readonly sourceBuildSpec: cb.BuildSpec
}

export interface FrontEndDeploymentProps extends GenericDeploymentProps{
    onWebsiteBucketCreation?(bucket: s3.Bucket): void
    appIndex: string
}

export interface ApiDeploymentProps extends GenericDeploymentProps{
    apiCreationCallback?(handler: lambda.Function, api: apiGw.LambdaRestApi): void
    /*
        Allow clients to configure all function settings EXCEPT the code source
    */
    handlerProps: ApiHandlerProps
}

export interface AppDeploymentProps extends cdk.ResourceProps{
    readonly stageName: string
    readonly appName: string
    readonly projectRoot?: string
    cdkSourceProvider(output: cp.Artifact): cpActions.Action,
    readonly frontEndProps: FrontEndDeploymentProps,
    readonly apiProps: ApiDeploymentProps
}

export class AppDeployment extends cdk.Resource{

    public readonly pipeline: cp.Pipeline
    readonly apiStackName: string
    readonly projectRoot?: string

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentProps){
        super(scope, id, props);

        this.projectRoot = props.projectRoot

        const apiStage = new LambdaApiStage(this, 'LambdaApiStage', {
            stageName: props.stageName,
            serviceName: props.appName,
            apiCreationCallback: props.apiProps.apiCreationCallback,
            handlerProps: props.apiProps.handlerProps
        });

        this.apiStackName = apiStage.stackName

        const frontEndStageBucket = new s3.Bucket(this, 'HostBucket', {
            bucketName: props.appName.toLowerCase(),
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: props.frontEndProps.appIndex
        });
        
        const artifacts = {
            cdk: getBuildAndReleaseArtifacts(),
            api: getBuildAndReleaseArtifacts(),
            frontEnd: getBuildAndReleaseArtifacts()
        }

        const deployPipelineName = `${props.appName}-${props.stageName}-deploy-pipeline`;

        this.pipeline = new cp.Pipeline(this, 'DeployPipeline', {
            pipelineName: deployPipelineName,
            stages: [{
                stageName: 'Source',
                actions: [
                    props.cdkSourceProvider(artifacts.cdk.source)
                ]
            }, {
                stageName: 'BuildApi',
                actions: [
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildApiRelease',
                        buildProjectName: `${props.appName}-api-source-build-${props.stageName}`,
                        buildSpec: props.apiProps.sourceBuildSpec,
                        input: artifacts.cdk.source,
                        outputs: [artifacts.api.release]
                    }),
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildApiCfn',
                        buildProjectName: `${props.appName}-api-cfn-build-${props.stageName}`,
                        buildSpec: this.getCdkBuildSpec(),
                        input: artifacts.cdk.source,
                        outputs: [artifacts.cdk.release]
                    })
                ]
            }, {
                stageName: 'DeployApi',
                actions: [
                    new cpActions.CloudFormationCreateUpdateStackAction({
                        actionName: 'DeployCfnApiRelease',
                        stackName: `${props.appName}-${props.stageName}-api`,
                        templatePath: artifacts.cdk.release.atPath(`${apiStage.stackName}.template.json`),
                        adminPermissions: true,
                        parameterOverrides: {
                            ...apiStage.lambdaCodeFromParams.assign(artifacts.api.release)
                        }
                    })
                ]
            }, {
                stageName: 'BuildFrontend',
                actions: [
                    generateAppDeploymentBuildAction(this, {
                        actionName: 'BuildFrontEnd',
                        buildProjectName: `${props.appName}-frontend-build-${props.stageName}`,
                        buildSpec: props.frontEndProps.sourceBuildSpec,
                        environmentVariables: {
                            API_URL: {
                                value: apiStage.apiUrlParameterName
                            }
                        },
                        input: artifacts.cdk.source,
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
        })
    }

    getCdkBuildSpec(): cb.BuildSpec {
        const installCommands = ['npm install']
        const buildCommands = [`npm run cdk synth -- ${this.apiStackName}`]
        const switchDirCommnad = this.projectRoot && `cd ${this.projectRoot}`
        if(switchDirCommnad){
            installCommands.push(switchDirCommnad);
            buildCommands.push(switchDirCommnad);
        }
        const artifactContext = this.projectRoot ? `${this.projectRoot}/`: ''
        const artifactFile = `${artifactContext}${this.apiStackName}.template.json`
        return cb.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    runtime_versions: {
                        nodejs: 12
                    },
                    commnads: installCommands
                },
                build: {
                    commands: buildCommands
                }
            },
            artifacts: {
                files: [artifactFile]
            }
        });
    }
}