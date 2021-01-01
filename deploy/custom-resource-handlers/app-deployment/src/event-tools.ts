import { CodePipeline } from './clients/code-pipeline';
import { Bucket } from './clients/s3';
import { Stack } from './clients/cfn';
import { BuildProject } from './clients/code-build';

export type AppDeploymentProps = {
    codePipeline: CodePipeline
    pipelineBuilder: BuildProject
    apiStack: Stack
    pipelineStack: Stack
    frontendBucket: Bucket
    artifactBucket: Bucket
}

export function getAppDeploymentProps(resourceProps: any): AppDeploymentProps{
    return {
        codePipeline: new CodePipeline(resourceProps['codePipelineName']),
        frontendBucket: new Bucket(resourceProps['frontendBucketName']),
        artifactBucket: new Bucket(resourceProps['artifactBucketName']),
        apiStack: new Stack(resourceProps['apiStackName']),
        pipelineBuilder: new BuildProject(resourceProps['pipelineBuilderName']),
        pipelineStack: new Stack(resourceProps['pipelineStackName'])
    }
}

export function getNewAppDeploymentProps(event: any){
    return getAppDeploymentProps(event['ResourceProperties']);
}

export function getOldAppDeploymentProps(event: any){
    return getAppDeploymentProps(event['OldResourceProperties']);
}