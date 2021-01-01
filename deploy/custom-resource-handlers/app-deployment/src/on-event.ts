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
module.exports.handler = async (event: any) => {
        
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

        /**
         * We will need to delete the bucket contents if different
         * AppDeployment Config is present during an update.
         */
        if(requestType === 'Update'){
            const oldFrontendBucketName = event['OldResourceProperties']['frontendBucketName']
            if(frontendBucket.name !== oldFrontendBucketName){
                console.log('Deleting old bucket contents');
                await frontendBucket.deleteAllObjects();
                await artifactBucket.deleteAllObjects();
            }
        }

        console.log('Starting pipeline builder');
        await pipelineBuilder.startAndWait();
        
        var pipelineExecutionId: string | undefined;
        
        /**
         * The pipeline starts itself during a create event, so
         * we will just get the current execution id during Create
         */
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