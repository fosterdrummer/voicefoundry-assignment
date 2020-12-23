import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import {Artifact} from '@aws-cdk/aws-codepipeline';

import { AppDeployment } from '../custom-resources/app-deployment/app-deployment';
import { BuildSpec } from '@aws-cdk/aws-codebuild';
import { Runtime } from '@aws-cdk/aws-lambda';

export interface DeployStackProps extends cdk.StackProps{
    repo: cc.Repository
}

export class DeployStack extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props: DeployStackProps){
        super(scope, id, props);

        const getRepoSourceAction = function(actionName: string): (a: Artifact) => cpActions.Action {
            return (artifact: Artifact): cpActions.Action => {
                return new cpActions.CodeCommitSourceAction({
                    actionName: actionName,
                    repository: props.repo,
                    output: artifact
                })
            }
        }

        new AppDeployment(this, 'Prod', {
            stageName: 'prod',
            projectRoot: 'tulsa-weather-deploy',
            appName: 'tulsa-weather-app',
            cdkSourceProvider: getRepoSourceAction('CheckoutCDK'),
            frontEndProps: {
                appIndex: 'index.html',
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildSpec.yaml'),
                sourceProvider: getRepoSourceAction('CheckoutFrontend')
            },
            apiProps: {
                handlerProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'src/index.handler'
                },
                sourceBuildSpec: BuildSpec.fromSourceFilename('tulsa-weather-app/react-app/buildSpec.yaml'),
                sourceProvider: getRepoSourceAction('CheckoutApi')
            }
        })
    }
}