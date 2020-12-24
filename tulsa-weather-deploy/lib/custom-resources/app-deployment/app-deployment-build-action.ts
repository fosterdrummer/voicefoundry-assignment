import * as cdk from '@aws-cdk/core';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as iam from '@aws-cdk/aws-iam';

export type AppDeploymentBuildActionProps = {
    actionName: string
    buildProjectName: string
    buildSpec: cb.BuildSpec
    environmentVariables?: {[name: string]: cb.BuildEnvironmentVariable}
    input: cp.Artifact
    outputs?: cp.Artifact[]
}

export function generateAppDeploymentBuildAction(scope: cdk.Construct, props: AppDeploymentBuildActionProps){
    const project = new cb.PipelineProject(scope, `BuildProject-${props.buildProjectName}`, {
        projectName: props.buildProjectName,
        buildSpec: props.buildSpec,
        environment: {
            privileged: true,
            buildImage: cb.LinuxBuildImage.STANDARD_4_0
        },
        environmentVariables: props.environmentVariables,
        cache: cb.Cache.local(cb.LocalCacheMode.DOCKER_LAYER)
    })
    project.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))
    return new cpActions.CodeBuildAction({
        actionName: props.actionName,
        project: project,
        input: props.input,
        outputs: props.outputs
    })
}