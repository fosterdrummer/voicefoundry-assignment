#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { S3AppDeployment } from '../lib/cdk-stack';

const app = new cdk.App();
new S3AppDeployment(app, 'TulsaWeatherAppDeployment', {
    appName: 'tulsa-weather-app',
    appIndexFileName: 'index.html',
    buildPath: '../react-app/build'
});
