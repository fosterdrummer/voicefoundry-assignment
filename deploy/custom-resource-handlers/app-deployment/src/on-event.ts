import {
    CloudFormationCustomResourceEvent
} from 'aws-lambda';
import { getAppDeploymentProps } from './event-tools'
import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION

/**
 * This handler will have the following responsbilities on a given Cloudformation
 * Event:
 * CREATE/UPDATE: 
 * - Build the deployment pipeline using the pipeline builder
 * UPDATE:
 * - Start the deployment pipeline once it is built
 * DELETE:
 * - Delete objects in the frontend and artifact bucket
 * - Delete the api and pipeline stacks
 */
module.exports.handler = async (event: CloudFormationCustomResourceEvent) => {
        
    const requestType = event.RequestType

    const {
        pipelineBuilder,
        artifactBucket,
        frontendBucket,
        apiStack,
        pipelineStack,
        codePipeline
    } = getAppDeploymentProps(event);

    if(requestType !== 'Delete'){
        console.log('Starting pipeline builder');
        await pipelineBuilder.startAndWait();
        var pipelineExecutionId: string | undefined;
        if(requestType === 'Create'){
            pipelineExecutionId = await codePipeline.getCurrentExecutionId();
        } else {
            pipelineExecutionId = await codePipeline.start();
        }
        if(!pipelineExecutionId){
            throw 'No valid execution id found.';
        }
        console.log('Starting deployment pipeline');
        await codePipeline.waitForExecutionToComplete(pipelineExecutionId);
    } else {
        console.log('Deleting bucket objects and apiStack.')
        await Promise.all([
            frontendBucket.deleteAllObjects(),
            artifactBucket.deleteAllObjects(),
        ]);
        console.log('Deleting api stack');
        await apiStack.deleteAndWait();
        console.log('Deleting pipeline stack');
        await pipelineStack.deleteAndWait();
    }

    return {
        PhysicalResourceId: frontendBucket.name,
        Data: {
            frontendUrl: frontendBucket.getWebUrl()
        }
    };
}