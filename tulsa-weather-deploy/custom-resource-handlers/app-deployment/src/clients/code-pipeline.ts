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
        console.log(`Starting new pipeline execution in ${this.name}`);
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
            return execution.status as ExecutionResult
        });
    }
}



