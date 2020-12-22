import * as cdk from '@aws-cdk/core';
import * as cb from '@aws-cdk/aws-codebuild';
import * as cp from '@aws-cdk/aws-codepipeline';
import * as cpActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';

const ALL_THE_ACCESS = iam.ManagedPolicy
    .fromAwsManagedPolicyName('AdministratorAccess');

export type CdkDeploymentProps = {
    readonly buildProjectName: string,
    readonly buildSpecPath: string,
    readonly deploymentStackName: string,
    readonly sourceCode: cp.Artifact,
    inputs?: cp.Artifact[],
    cfnOutput?: cp.Artifact
}

export class CdkDeployment extends cdk.Construct{

    readonly buildAction: cpActions.CodeBuildAction
    readonly deployAction: cpActions.CloudFormationCreateUpdateStackAction
    readonly deploymentStackName: string
    readonly cfnOutput: cp.Artifact

    constructor(scope: cdk.Construct, id: string, props: CdkDeploymentProps){
        super(scope, id);

        this.deploymentStackName = props.deploymentStackName

        const cfn = new cp.Artifact(`${props.buildProjectName}-cfn-bundle`);
        
        const project = new cb.PipelineProject(this, 'BuildCfnProject', {
            projectName: props.buildProjectName,
            buildSpec: cb.BuildSpec
                .fromSourceFilename(props.buildSpecPath),
            environment: {
                privileged: true,
                buildImage: cb.LinuxBuildImage.STANDARD_2_0
            }
        })

        project.role?.addManagedPolicy(ALL_THE_ACCESS)

        if(!props.inputs) props.inputs = []

        this.buildAction = new cpActions.CodeBuildAction({
            actionName: 'Build',
            input: props.sourceCode,
            extraInputs: props.inputs,
            project: project,
            outputs: [cfn],
        })

        this.deployAction = new cpActions.CloudFormationCreateUpdateStackAction({
            actionName: 'Deploy',
            stackName: props.deploymentStackName,
            templatePath: cfn.atPath(`${this.deploymentStackName}.template.json`),
            adminPermissions: true,
            output: props.cfnOutput
        })
    }

    bindToPipeline(pipeline: cp.Pipeline): void {
        pipeline.addStage({
            stageName: `Build${this.deploymentStackName}`,
            actions: [this.buildAction]
        })
        pipeline.addStage({
            stageName: `Deploy${this.deploymentStackName}`,
            actions: [this.deployAction]
        })
    }

}