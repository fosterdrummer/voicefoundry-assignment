import * as cdk from '@aws-cdk/core';
import * as cb from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import { AppDeploymentPipeline, AppDeploymentPipelineProps } from './pipeline'
import { cdkBuildSpec } from './cdk-buildspec';

/**
 * This Construct will generate a CodeBuild "Pipeline Builder" project.
 * The Pipeline Build project will be used to deploy the app's code pipeline
 */
export class AppDeploymentPipelineBuilder extends cdk.Construct{
    
    pipelineBuildProject: cb.Project
    pipelineStack: AppDeploymentPipeline
    
    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps){
        super(scope, id);

        this.pipelineStack = new AppDeploymentPipeline(this, 'DeploymentPipeline', props);        

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
                    `npm run cdk deploy ${this.pipelineStack.stackName} -- --require-approval never`
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