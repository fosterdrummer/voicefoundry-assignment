#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TulsaWeatherAppDeployment } from '../lib/stacks/tulsa-weather-app-deployment';

const app = new cdk.App();

new TulsaWeatherAppDeployment(app, 'TulsaWeatherApp');
