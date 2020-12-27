import {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceSuccessResponse
} from 'aws-lambda';
import { getAppDeploymentProps } from './event-tools'
import { CodePipeline, ExecutionResult } from './clients/code-pipeline';
import { Stack } from './clients/cfn';
import { Bucket } from './clients/s3';
import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION

module.exports.handler = async (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceSuccessResponse> => {
    
    const requestType = event.RequestType

    const props = getAppDeploymentProps(event);
    const codePipeline = new CodePipeline(props.codePipelineName);

    const pipelineExecutionId = await (async function(){        
        switch(requestType){
            case 'Create':
                return codePipeline.getCurrentExecutionId();
            case 'Update':
                return codePipeline.start();
            case 'Delete':
                return '';
        }
    })();

    if(pipelineExecutionId === undefined){
        throw `No valid ${codePipeline.name} execution id was found during ${event.RequestType}.`
    }

    if(pipelineExecutionId !== ''){
        const pipelineResult = await codePipeline.waitForExecutionToComplete(pipelineExecutionId);
        if(pipelineResult !== ExecutionResult.SUCCESS){
            throw `${props.codePipelineName} exection '${pipelineExecutionId}' finished in an invalid state: ${pipelineResult}`;
        }
    }

    if(requestType === 'Delete'){
        await Promise.all([
            new Bucket(props.frontendBucketName).deleteAllObjects(),
            new Bucket(props.artifactBucketName).deleteAllObjects(),
            new Stack(props.apiStackName).delete()
        ]);
    }
    /*
        Return our successful result. Failures will be returned through thrown
        execeptions before this point.
    */
    return {
        RequestId: event.RequestId,
        StackId: event.StackId,
        LogicalResourceId: event.LogicalResourceId,
        Status: 'SUCCESS',
        PhysicalResourceId: props.frontendBucketName,
        Data: {
            frontendBucketUrl: props.frontendBucketUrl,
        }
    };
}