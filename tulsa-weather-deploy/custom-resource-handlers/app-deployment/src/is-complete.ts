import { getAppDeploymentProps } from './event-tools';
import { ExecutionResult } from './clients/code-pipeline';
import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION;

module.exports.handler = async (event: any) => {
    
    const codePipeline = getAppDeploymentProps(event).codePipeline;
    
    const pipelineExecutionId = event['PipelineExecutionId'];

    var isComplete = true;
    var data: {[name: string]: string} | undefined;
    
    if(event.RequestType !== 'Delete'){
        const result = await codePipeline.getExecutionResult(pipelineExecutionId);
        if(result === ExecutionResult.IN_PROGRESS){
            isComplete = false;
        } else if(result !== ExecutionResult.SUCCESS){
            throw `The code pipeilne ${codePipeline.name} finished in an invalid state: ${result}`;
        }
    }

    return {
        IsComplete: isComplete,
        Data: data
    }
}