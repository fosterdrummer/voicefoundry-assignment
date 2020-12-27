import {
    CloudFormationCustomResourceEvent
} from 'aws-lambda';

export type AppDeploymentProps = {
    codePipelineName: string
    apiStackName: string
    bucketUrl: string
    bucketName: string
}

export function getAppDeploymentProps(event: any): AppDeploymentProps{
    return {
        codePipelineName: event['ResourceProperties']['codePipelineName'],
        bucketName: event['ResourceProperties']['bucketName'],
        bucketUrl: event['ResourceProperties']['bucketUrl'],
        apiStackName: event['ResourceProperties']['apiStackName']
    }
}