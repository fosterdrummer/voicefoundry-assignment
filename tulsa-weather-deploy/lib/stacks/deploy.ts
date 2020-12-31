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
                oauthToken: cdk.SecretValue.secretsManager('GithubPrivateToken'),
                branch: 'develop'
            },
            apiStackProps: {
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'src/index.handler'
                }
            },
            appName: 'tulsa-weather-app',
            cdkSubDirectory: 'tulsa-weather-deploy',
            appEnv: 'test',
            frontendBucketProps: {
                indexDocument: 'index.html'
            },
            frontendBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-api/handler/buildspec.yaml')
            },
            apiBuildProps: {
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildspec.yaml')
            }
        });

    }
}