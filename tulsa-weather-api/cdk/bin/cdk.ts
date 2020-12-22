#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as ssm from '@aws-cdk/aws-ssm';
import { LambdaApiDeployment } from '../lib/cdk-stack';

const app = new cdk.App();

new LambdaApiDeployment(app, 'TulsaWeatherApiDeployment', {
    serviceName: 'tulsa-weather-api',
    serviceDescription: 'An api that returns the current weather in tulsa OK',
    projectPath: '../handler',
    handler: 'index.handler',
    apiUrlParameterName: '/tulsa-weather-api/api-url',
    lambdaEnvironmentVars: {
        OPEN_WEATHER_MAP_API_KEY: '113161f05470d59fa6f2c364d7f2a897',
        OPEN_WEATHER_MAP_CITY_ID: '4553433'
    }
});
