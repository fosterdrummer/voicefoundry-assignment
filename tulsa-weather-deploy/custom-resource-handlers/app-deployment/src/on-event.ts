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

    const pipelineExectionId = await (async function(){        
        if(requestType == 'Delete'){
            return '';
        }
        console.log('Starting pipeline builder.')
        await pipelineBuilder.startAndWait();
        console.log('Start the code pipeline.');
        return codePipeline.start();
    })();

    if(pipelineExectionId === undefined){
        throw `Failed to retrieve current buildId for code build project ${pipelineBuilder.name}`;
    }

    if(requestType === 'Delete'){
        console.log('Deleting bucket objects and apiStack.')
        await Promise.all([
            frontendBucket.deleteAllObjects(),
            artifactBucket.deleteAllObjects(),
        ]);
        await apiStack.deleteAndWait();
        await pipelineStack.deleteAndWait();
    }

    return {
        PhysicalResourceId: frontendBucket.name,
        PipelineExecutionId: pipelineExectionId,
    };
}