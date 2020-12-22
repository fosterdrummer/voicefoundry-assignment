import * as cdk from '@aws-cdk/core';
import * as cc from '@aws-cdk/aws-codecommit';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam'
import * as cb from '@aws-cdk/aws-codebuild';

const ALL_THE_ACCESS = iam.ManagedPolicy
    .fromAwsManagedPolicyName('AdministratorAccess');

export type BuildConfig = {
    readonly projectName: string
    readonly buildSpecPath: string
}

export interface FullStackDeployPipelineProps extends cdk.StackProps{
    readonly sourceRepo: cc.Repository
    readonly pipelineName: string
    readonly apiBuildConfig: BuildConfig
    readonly appBuildConfig: BuildConfig
}

export class FullStackDeployPipeline extends cdk.Stack{

    sourceCode: cp.Artifact

    constructor(scope: cdk.Construct, id: string, props: FullStackDeployPipelineProps){
        super(scope, id, props);

        this.sourceCode = new cp.Artifact('SourceCode');

        const checkoutSourceCode = new cpActions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: props.sourceRepo,
            output: this.sourceCode,
            trigger: cpActions.CodeCommitTrigger.NONE
        });

        new cp.Pipeline(this, 'FullStackPipeline', {
            pipelineName: props.pipelineName,
            stages: [{
                stageName: "Source",
                actions: [checkoutSourceCode]
            }, {
                stageName: "DeployApi",
                actions: [
                    this.generateDeployAction(props.apiBuildConfig)
                ]
            }, {
                stageName: "DeployApp",
                actions: [
                    this.generateDeployAction(props.appBuildConfig)
                ]
            }]
        });
    }

    generateDeployAction(buildConfig: BuildConfig): cpActions.CodeBuildAction {
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
        return new cpActions.CodeBuildAction({
            actionName: `Deploy-${buildConfig.projectName}`,
            input: this.sourceCode,
            project: project,
        });
    }
}

