import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import {Artifact} from '@aws-cdk/aws-codepipeline';

import { AppDeploymentPipeline } from '../custom-resources/app-deployment/app-deployment-pipeline';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';

export class DeployStack extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props);

        const prodDeployment = new AppDeploymentPipeline(this, 'Prod', {
            githubSourceProps: {
                owner: 'fosterdrummer',
                repo: 'voicefoundry-assignment',
                oauthToken: new cdk.SecretValue('abe84c5e9e054f09b2d7567e110fc971ecf0b74a')
            },
            appProps: {
                appName: 'tulsa-weather-app',
                indexDocument: 'index.html',
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'build/index.handler'
                }
            },
            cdkSubDirectory: 'tulsa-weather-deploy',
            appEnv: 'test',
            frontendBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-api/handler/buildspec.yaml')
            },
            apiBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildspec.yaml')
            }
        });

    }
}