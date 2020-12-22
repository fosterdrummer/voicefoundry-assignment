#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SourceControl } from '../lib/stacks/source-control';
import { FullStackDeployPipeline } from '../lib/stacks/fullstack-deploy-pipeline';

const app = new cdk.App();

const sourceControl = new SourceControl(app, 'TulsaWeatherAppSourceControl', {
    repoName: 'tulsa-weather-app'
});

const deployPipeline = new FullStackDeployPipeline(app, 'TulsaWeatherAppDeployPipeline', {
    pipelineName: 'tulsa-weather-app-deploy-pipeline',
    sourceRepo: sourceControl.codeRepo.repo,
    appBuildConfig: {
        projectName: 'tulsa-weather-app-build',
        buildSpecPath: 'tulsa-weather-app/cdk/buildspec.yaml',
    },
    apiBuildConfig: {
        projectName: 'tulsa-weather-api-build',
        buildSpecPath: 'tulsa-weather-api/cdk/buildspec.yaml',
    }
});

deployPipeline.addDependency(sourceControl);




