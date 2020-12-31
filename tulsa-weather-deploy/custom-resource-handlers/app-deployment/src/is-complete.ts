import { getAppDeploymentProps } from './event-tools';
import { CodePipeline, ExecutionResult } from './clients/code-pipeline';
import { Stack } from './clients/cfn';

module.exports.handler = async (event: any) => {
    const props = getAppDeploymentProps(event);
    const pipelineExecutionId = event['PipelineExecutionId'];
    
    const codePipelineResult = await new CodePipeline(props.codePipelineName)
        .getExecutionResult(pipelineExecutionId);
    
    var isComplete = false;
    var data: {[name: string]: string} | undefined;
    if(event.RequestType === 'Delete'){
        isComplete = await new Stack(props.apiStackName).isDeleted();
    } else if(codePipelineResult === ExecutionResult.SUCCESS){
        isComplete = true
        data = { frontendBucketUrl: props.frontendBucketUrl }
    } else if(codePipelineResult !== ExecutionResult.IN_PROGRESS){
        throw `Error: the ${props.codePipelineName} exection ${pipelineExecutionId} finished in an invalid state: ${codePipelineResult}`
    }
    return {
        IsComplete: isComplete,
        Data: data
    }
}