import {
    CloudFormationCustomResourceEvent
} from 'aws-lambda';

export type AppDeploymentProps = {
    codePipelineName: string
    apiStackName: string
    frontendBucketUrl: string
    frontendBucketName: string
    artifactBucketName: string
}

export function getAppDeploymentProps(event: any): AppDeploymentProps{
    const resourceProps = event['ResourceProperties']
    return {
        codePipelineName: resourceProps['codePipelineName'],
        frontendBucketName: resourceProps['frontendBucketName'],
        artifactBucketName: resourceProps['artifactBucketName'],
        frontendBucketUrl: resourceProps['frontendBucketUrl'],
        apiStackName: resourceProps['apiStackName'],
    }
}