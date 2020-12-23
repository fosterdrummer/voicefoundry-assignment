import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam'
import * as cb from '@aws-cdk/aws-codebuild';
import { string1To1000 } from 'aws-sdk/clients/customerprofiles';

const ALL_THE_ACCESS = iam.ManagedPolicy
    .fromAwsManagedPolicyName('AdministratorAccess');

export type BuildConfig = {
    readonly projectName: string
    readonly buildSpecPath: string
    readonly stackName: string
}

export interface FullStackDeployPipelineProps extends cdk.StackProps{
    readonly pipelineStage: string
    readonly sourceRepo: cc.Repository
    readonly pipelineName: string
    readonly apiBuildConfig: BuildConfig
    readonly appBuildConfig: BuildConfig
}

export class FullStackDeployPipeline extends cdk.Stack{

    sourceCode: cp.Artifact
    pipelineStage: string 

    constructor(scope: cdk.Construct, id: string, props: FullStackDeployPipelineProps){
        super(scope, id, props);
        this.pipelineStage = props.pipelineStage
        this.sourceCode = new cp.Artifact('SourceCode');
        const checkoutSourceCode = new cpActions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: props.sourceRepo,
            output: this.sourceCode,
            trigger: cpActions.CodeCommitTrigger.NONE
        });
        const pipeline = new cp.Pipeline(this, 'FullStackPipeline', {
            pipelineName: props.pipelineName,
            stages: [{
                stageName: "Source",
                actions: [checkoutSourceCode]
            }]
        });
        this.addDeployStage(props.apiBuildConfig, pipeline, 'Api');
        this.addDeployStage(props.appBuildConfig, pipeline, 'App');
    }

    addDeployStage(buildConfig: BuildConfig, pipeline: cp.Pipeline, component: string): void {
        const cfnArtifact = new cp.Artifact(`${buildConfig.projectName}-cfn-bundle`)
        const project = new cb.PipelineProject(this, `CodeBuildProject-${buildConfig.projectName}`, {
            projectName: buildConfig.projectName,
            buildSpec: cb.BuildSpec
                .fromSourceFilename(buildConfig.buildSpecPath),
            environment: {
                privileged: true,
                buildImage: cb.LinuxBuildImage.STANDARD_2_0
            },
            cache: cb.Cache.local(cb.LocalCacheMode.DOCKER_LAYER)
        });
        project.role?.addManagedPolicy(ALL_THE_ACCESS);
        const buildAction = new cpActions.CodeBuildAction({
            actionName: `Build-${buildConfig.projectName}`,
            input: this.sourceCode,
            project: project,
            outputs: [cfnArtifact]
        });
        pipeline.addStage({
            stageName: `Build${component}`,
            actions: [buildAction]
        });
        const deployAction = new cpActions.CloudFormationCreateUpdateStackAction({
            actionName: `Deploy-${buildConfig.projectName}`,
            stackName: `${buildConfig.projectName}-${this.pipelineStage}`,
            templatePath: cfnArtifact.atPath(`${buildConfig.stackName}.template.json`),
            adminPermissions: true
        });
        pipeline.addStage({
            stageName: `Deploy${component}`,
            actions: [deployAction]
        });
    }
}

