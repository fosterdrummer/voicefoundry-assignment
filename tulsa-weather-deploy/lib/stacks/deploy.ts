import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import {Artifact} from '@aws-cdk/aws-codepipeline';

import { AppDeploymentPipeline } from '../app-deployment/app-deployment-pipeline';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';
import { AppDeploymentPipelineBuilder } from '../app-deployment/app-deployment-pipeline-builder';

export class DeployStack extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props);

        new AppDeploymentPipelineBuilder(this, 'TestDeployment', {
            githubSourceProps: {
                owner: 'fosterdrummer',
                repo: 'voicefoundry-assignment',
                oauthToken: new cdk.SecretValue('0d41769fc3905938e959b0a5394ca58a762b887f'),
                branch: 'develop'
            },
            apiStackProps: {
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'src/index.handler'
                }
            },
            appName: 'tulsa-weather-app',
            cdkSubDirectory: 'tulsa-weather-deploy',
            appEnv: 'test',
            frontendBucketProps: {
                indexDocument: 'index.html'
            },
            frontendBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-api/handler/buildspec.yaml')
            },
            apiBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildspec.yaml')
            }
        });

    }
}