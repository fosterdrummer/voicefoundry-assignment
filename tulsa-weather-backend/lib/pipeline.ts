import * as cdk from '@aws-cdk/core';
import { Pipeline, Artifact } from '@aws-cdk/aws-codepipeline';
import { BuildSpec, PipelineProject, LinuxBuildImage } from '@aws-cdk/aws-codebuild'
import { CodeCommitSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions'
import { Repository } from '@aws-cdk/aws-codecommit';
import * as iam from '@aws-cdk/aws-iam'

export interface PipelineProps extends cdk.StackProps{
    readonly repoName: string
}

export class TulsaWeatherServiceApiPipeline extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props: PipelineProps){
        super(scope, id, props);

        const codeArtifact = new Artifact('SourceCode');

        const codeAction = new CodeCommitSourceAction({
            repository: Repository.fromRepositoryName(this, 'RepoName', props.repoName),
            actionName: 'Source',
            output: codeArtifact
        });

        const buildProject = new PipelineProject(this, 'BuildTheThing', {
            projectName: 'tulsa-weather-api-build',
            buildSpec: BuildSpec.fromSourceFilename("tulsa-weather-api/buildspec.yaml"),
            environment: {
                buildImage: LinuxBuildImage.STANDARD_2_0,
                privileged: true
            }
        });

        const allowCfnAccess = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: ["cloudformation:*", "s3:*", "iam:*"]
        })

        buildProject.addToRolePolicy(allowCfnAccess);
        
        new Pipeline(this, 'ApiCodeProject', {
            pipelineName: 'tulsa-weather-api-deploy',
            stages: [
                {
                    stageName: 'Source',
                    actions: [codeAction]
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new CodeBuildAction({
                            actionName: 'Deploy',
                            project: buildProject,
                            input: codeArtifact
                        })
                    ]
                }
            ]
        })
    }
}