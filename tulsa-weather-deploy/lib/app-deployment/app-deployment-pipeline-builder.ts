import * as cdk from '@aws-cdk/core';
import * as cb from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import { AppDeploymentPipeline, AppDeploymentPipelineProps } from './app-deployment-pipeline'
import { cdkBuildSpec } from './cdk-buildspec';

export class AppDeploymentPipelineBuilder extends cdk.Construct{
    
    pipelineBuildProject: cb.Project
    pipeline: AppDeploymentPipeline

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps){
        super(scope, id);

        this.pipeline = new AppDeploymentPipeline(this, 'DeploymentPipeline', props);        

        this.pipelineBuildProject = new cb.Project(this, 'PipelineBuilderProject', {
            projectName: `${props.appName}-${props.appEnv}-pipeline-builder`,
            source: cb.Source.gitHub({
                repo: props.githubSourceProps.repo,
                owner: props.githubSourceProps.owner,
                branchOrRef: props.githubSourceProps.branch
            }),
            buildSpec: cdkBuildSpec({
                cdkProjectRoot: props.cdkSubDirectory,
                deployCommands: [
                    `npm run cdk deploy ${this.pipeline.stackName}`
                ]
            }),
            environment: {
                privileged: true,
                buildImage: cb.LinuxBuildImage.STANDARD_4_0
            }
        });
        this.pipelineBuildProject.role?.addManagedPolicy(iam
            .ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    }
}