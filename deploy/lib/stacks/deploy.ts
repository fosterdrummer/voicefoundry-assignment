import * as cdk from '@aws-cdk/core';
import * as sm from '@aws-cdk/aws-secretsmanager';

import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';
import { AppDeployment } from '../app-deployment/app-deployment';

export class DeployStack extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props);

        new AppDeployment(this, 'TestDeployment', {
            githubSourceProps: {
                owner: 'fosterdrummer',
                repo: 'voicefoundry-assignment',
                oauthToken: cdk.SecretValue.secretsManager('GitHub_PrivateToken'),
                branch: 'develop'
            },
            apiStackProps: {
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'src/index.handler',
                    environment: {
                        OPEN_WEATHER_MAP_SECRET_ID: 'Owm_ApiKey',
                        OPEN_WEATHER_MAP_CITY_ID: '4553433',
                        REGION: this.region
                    }
                }
            },
            appName: 'tulsa-weather-app',
            cdkSubDirectory: 'deploy',
            appEnv: 'test',
            frontendBucketProps: {
                indexDocument: 'index.html'
            },
            frontendBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('app/buildspec.yaml')
            },
            apiBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('api/buildspec.yaml')
            }
        });

    }
}