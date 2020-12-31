#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AppDeploymentPipeline } from '../lib/app-deployment/app-deployment-pipeline';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';
import { DeployStack } from '../lib/stacks/deploy';

const app = new cdk.App();

new DeployStack(app, 'DeployStack');
