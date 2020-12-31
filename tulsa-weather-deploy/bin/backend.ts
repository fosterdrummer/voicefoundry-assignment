#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AppDeploymentPipeline } from '../lib/app-deployment/app-deployment-pipeline';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';

const app = new cdk.App();

new AppDeploymentPipeline(app, 'TestDeployment', {
    githubSourceProps: {
        owner: 'fosterdrummer',
        repo: 'voicefoundry-assignment',
        oauthToken: new cdk.SecretValue('abe84c5e9e054f09b2d7567e110fc971ecf0b74a'),
        branch: 'develop'
    },
    appProps: {
        appName: 'tulsa-weather-app',
        indexDocument: 'index.html',
        handlerProps: {
            runtime: Runtime.NODEJS_12_X,
            handler: 'src/index.handler'
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
