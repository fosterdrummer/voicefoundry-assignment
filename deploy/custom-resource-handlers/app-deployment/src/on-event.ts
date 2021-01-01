import { 
    getNewAppDeploymentProps,
    getOldAppDeploymentProps,
} from './event-tools';
import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION

/**
 * This handler will have the following responsbilities on a given Cloudformation
 * Event:
 * CREATE/UPDATE: 
 * - Build the deployment pipeline using the pipeline builder
 * UPDATE:
 * - Start the deployment pipeline once it is built
 * - Delete old bucket contents if bucket names have changed
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
    } = getNewAppDeploymentProps(event);;

    if(requestType !== 'Delete'){

        /**
         * The old buckets will be deleted if the new bucket names don't
         * match the old ones during an update. So we will need to delete all objects
         * in the old buckets before they are removed during the pipeline update.
         */
        if(requestType === 'Update'){
            const oldProps = getOldAppDeploymentProps(event);
            if(frontendBucket.name !== oldProps.frontendBucket.name){
                await Promise.all([
                    oldProps.frontendBucket.deleteAllObjects(),
                    oldProps.artifactBucket.deleteAllObjects(),
                ]);
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
        
        console.log('Waiting for deployment pipeline to complete');
        await codePipeline.waitForExecutionToComplete(pipelineExecutionId);
    } else {
        console.log('Deleting bucket objects, api stack, and pipeline stack.')
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