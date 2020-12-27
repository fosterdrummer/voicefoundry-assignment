import AWS from 'aws-sdk'

export enum ExecutionResult{
    SUCCESS = 'Succeeded',
    FAILED = 'Failed',
    IN_PROGRESS = 'InProgress',
    STOPPED = 'Stopped',
    STOPPING = 'Stopping',
    SUSPENDED = 'Superseded'
}

export class CodePipeline{
    client: AWS.CodePipeline
    name: string
    constructor(pipelineName: string){
        this.client = new AWS.CodePipeline()
        this.name = pipelineName
    }

    async start(): Promise<string|undefined> {
        return this.client.startPipelineExecution({
            name: this.name
        }).promise()
        .then(data => data.pipelineExecutionId);
    }

    async getCurrentExecutionId(){
        return this.client.listPipelineExecutions({
            pipelineName: this.name
        }).promise()
            .then(data => data.pipelineExecutionSummaries)
            .then(summaries => {
                if(!summaries){
                    throw 'Error: no valid exection summaries where found in the code pipeline: ' + this.name
                }
                return summaries[0].pipelineExecutionId;
            });
    }

    async getExecutionSummary(executionId: string){
        return this.client.getPipelineExecution({
            pipelineName: this.name,
            pipelineExecutionId: executionId
        }).promise()
        .then(data => data.pipelineExecution);
    }

    async getExecutionResult(executionId: string){
        return this.getExecutionSummary(executionId)
            .then(execution => {
                if(!execution){
                    throw `Could not find a valid ${this.name} pipeline execution using exection id: ${executionId}`
                }
                switch(execution.status){
                    case ExecutionResult.FAILED:
                        return ExecutionResult.FAILED
                    case ExecutionResult.IN_PROGRESS:
                        return ExecutionResult.IN_PROGRESS
                    case ExecutionResult.STOPPED:
                        return ExecutionResult.STOPPED
                    case ExecutionResult.STOPPING:
                        return ExecutionResult.STOPPING
                    case ExecutionResult.SUCCESS:
                        return ExecutionResult.SUCCESS
                    case ExecutionResult.SUSPENDED:
                        return ExecutionResult.SUSPENDED
                }
            });
    }
}



