import {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceSuccessResponse
} from 'aws-lambda';
import { getAppDeploymentProps } from './event-tools'
import { CodePipeline } from './clients/code-pipeline';
import { Stack } from './clients/cfn';
import { Bucket } from './clients/s3';
import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION

module.exports.handler = async (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceSuccessResponse> => {
    const props = getAppDeploymentProps(event)
    /*
        The code pipeline will run automatically during a create so 
        I will not need to handle anything during the initial event.
    */
    const codePipeline = new CodePipeline(props.codePipelineName);
    const pipelineExecutionId = await (async function(){
        if(event.RequestType === 'Update'){
            return codePipeline.start();
        }
        return codePipeline.getCurrentExecutionId();
    })();
    if(!pipelineExecutionId){
        throw `No valid ${codePipeline.name} execution id was found during ${event.RequestType}.`
    }
    if(event.RequestType === 'Delete'){
        await Promise.all([
            new Bucket(props.bucketName).deleteAllObjects(),
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
        PhysicalResourceId: pipelineExecutionId,
        Data: {
            bucketUrl: props.bucketUrl
        }
    };
}