#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { S3AppHost } from '../lib/app-host';
import { LambdaApiServiceDeployment } from '../lib/api-deployment'
import { SourceControl } from '../lib/source-control';

const app = new cdk.App();

const sourceControl = new SourceControl(app, 'TulsaWeatherAppSourceControl', {
    repoName: 'tulsa-weather-app'
})

const lambda = new LambdaApiServiceDeployment(app, 'LambdaDeployment', {
    serviceName: 'tulsa-weather-service',
    serviceDescription: 'This thing is so cool! wow',
    projectPath: '../tulsa-weather-api',
    handler: 'index.handler'
})

new S3AppHost(app, 'ReactDeployment', {
    appName: 'tulsa-weather-app',
    appIndexFileName: 'index.html',
});

app.synth()