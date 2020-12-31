#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DeployStack } from '../lib/stacks/deploy';

const app = new cdk.App();

const deployStack = new DeployStack(app, 'DeployStack');

