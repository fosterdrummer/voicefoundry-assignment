#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LambdaApiDeployment } from '../lib/cdk-stack';

const app = new cdk.App();
new LambdaApiDeployment(app, 'TulsaWeatherApiDeployment', {
    serviceName: 'tulsa-weather-service',
    serviceDescription: 'An api that returns the current weather in tulsa OK',
    projectPath: '../handler',
    handler: 'index.handler'
});
