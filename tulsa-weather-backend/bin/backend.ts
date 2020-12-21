#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { S3AppDeployment } from '../lib/app-deployment';
import { LambdaApiServiceDeployment } from '../lib/api-deployment'
import { SourceControl } from '../lib/source-control';
import { TulsaWeatherServiceApiPipeline } from '../lib/pipeline'

const app = new cdk.App();

const scRepoName = 'tulsa-weather-app'

new SourceControl(app, 'TulsaWeatherAppSourceControl', {
    repoName: scRepoName
})

new TulsaWeatherServiceApiPipeline(app, 'ApiDeploymentPipeline', {
    repoName: scRepoName
});

new LambdaApiServiceDeployment(app, 'LambdaDeployment', {
    serviceName: 'tulsa-weather-service',
    serviceDescription: 'This thing is so cool! wow',
    projectPath: '../tulsa-weather-api',
    handler: 'index.handler'
});

new S3AppDeployment(app, 'ReactDeployment', {
    appName: 'tulsa-weather-app',
    appIndexFileName: 'index.html',
    buildPath: '../tulsa-weather-app/build'
});

app.synth()