import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import { CdkDeployment } from '../constructs/cdk-deployment'

export type BuildConfig = {
    readonly projectName: string
    readonly buildSpecPath: string
    readonly stackName: string
}

export interface FullStackDeployPipelineProps extends cdk.StackProps{
    readonly sourceRepo: cc.Repository
    readonly pipelineName: string
    readonly apiBuildConfig: BuildConfig
    readonly appBuildConfig: BuildConfig
}

export class FullStackDeployPipeline extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props: FullStackDeployPipelineProps){
        super(scope, id, props);

        const sourceCode = new cp.Artifact('SourceCode');
        const apiStackOutput = new cp.Artifact('ApiStackOutput');

        const checkoutSourceCode = new cpActions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: props.sourceRepo,
            output: sourceCode,
            trigger: cpActions.CodeCommitTrigger.NONE
        });

        const pipeline = new cp.Pipeline(this, 'FullStackPipeline', {
            pipelineName: props.pipelineName
        })

        pipeline.addStage({
            stageName: "Source",
            actions: [checkoutSourceCode]
        })

        new CdkDeployment(this, 'ApiBuildStage', {
            sourceCode: sourceCode,
            buildProjectName: props.apiBuildConfig.projectName,
            buildSpecPath: props.apiBuildConfig.buildSpecPath,
            deploymentStackName: props.apiBuildConfig.stackName
        }).bindToPipeline(pipeline);

        new CdkDeployment(this, 'AppBuildStage', {
            sourceCode: sourceCode,
            buildProjectName: props.appBuildConfig.projectName,
            buildSpecPath: props.appBuildConfig.buildSpecPath,
            deploymentStackName: props.appBuildConfig.stackName,
        }).bindToPipeline(pipeline);        
    }
}