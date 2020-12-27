import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import {Artifact} from '@aws-cdk/aws-codepipeline';

import { AppDeployment } from '../custom-resources/app-deployment/app-deployment';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';

export class DeployStack extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props);

        const repo = cc.Repository.fromRepositoryName(this, 'SrcRepo', 'tulsa-weather-app')

        const repoProvider = (artifact: Artifact): cpActions.Action => {
            return new cpActions.CodeCommitSourceAction({
                actionName: 'CheckoutRepo',
                repository: repo,
                output: artifact
            })
        }

        const prodDeployment = new AppDeployment(this, 'Prod', {
            stageName: 'test',
            cdkProjectRoot: 'tulsa-weather-deploy',
            appName: 'tulsa-weather-app',
            cdkSourceProvider: repoProvider,
            frontEndProps: {
                appIndex: 'index.html',
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildspec.yaml'),
            },
            apiProps: {
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'src/index.handler'
                },
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-api/handler/buildspec.yaml'),
            }
        });

        prodDeployment.pipeline.addToRolePolicy(iam.PolicyStatement.fromJson({
            "Sid": "AllPull",
            "Effect": "Allow",
            "Action": "codecommit:GitPull",
            "Resource": repo.repositoryArn
        }));
    }
}