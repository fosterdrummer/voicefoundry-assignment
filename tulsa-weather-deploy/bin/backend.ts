#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SourceControl } from '../lib/stacks/source-control';
import { DeployStack } from '../lib/stacks/deploy'

const app = new cdk.App();

const sourceControl = new SourceControl(app, 'TulsaWeatherAppSourceControl', {
    repoName: 'tulsa-weather-app'
});

const deployStack = new DeployStack(app, 'DeployStack', {
    repo: sourceControl.codeRepo.repo
});

deployStack.addDependency(sourceControl);






