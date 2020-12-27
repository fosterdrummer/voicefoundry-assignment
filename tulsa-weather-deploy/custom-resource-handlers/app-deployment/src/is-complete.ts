import {
    
} from 'aws-lambda';
import { getAppDeploymentProps } from './event-tools';
import { CodePipeline, ExecutionResult } from './clients/code-pipeline';
import { Stack } from './clients/cfn';
import AWS from 'aws-sdk';
import { AnyARecord } from 'dns';

AWS.config.region = process.env.REGION

/*
    Cloudformation will poll this handler to determine if 
    the deployment is complete or not during updates/deletes.
    The handler will need to throw errors if the code pipeline
    is not successful or in progress during that time.
    Cloudformation will also poll this handler to determine if
    the api stack is finished deleting during a delete event. 
*/
module.exports.handler = async (event: any) => {
    const props = getAppDeploymentProps(event);
    const generateResponse = function(isComplete: boolean){
        const response: any =  {
            IsComplete: isComplete,
        }
        if(isComplete){
            response.Data = { bucketUrl: props.bucketUrl };
        }
        return response;
    }    
    if(['Create','Update'].includes(event['RequestType'])){
        if(!props.codePipelineName){
            throw 'No props codepipeline name';
        }
        const pipelineExecutionResult = await new CodePipeline(props.codePipelineName)
            .getExecutionResult(event['PhysicalResourceId'])
        switch(pipelineExecutionResult){
            case ExecutionResult.SUCCESS:
                return generateResponse(true);
            case ExecutionResult.IN_PROGRESS:
                return generateResponse(false);
            default:
                throw `The ${props.codePipelineName} pipeline execution finished in an invalid state: ${pipelineExecutionResult}`;
        }
    }
    return generateResponse(await new Stack(props.apiStackName).isDeleted())
}