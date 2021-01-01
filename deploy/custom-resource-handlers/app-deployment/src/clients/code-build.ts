import AWS from "aws-sdk"

export enum BuildStatus{
    FAILED = 'FAILED',
    FAULT = 'FAULT',
    IN_PROGRESS = 'IN_PROGRESS',
    STOPPED = 'STOPPED',
    SUCCEEDED = 'SUCCEEDED',
    TIMED_OUT = 'TIMED_OUT'
}

export class BuildProject{
    name: string
    client: AWS.CodeBuild

    constructor(name: string){
        this.name = name;
        this.client = new AWS.CodeBuild();
    }

    /**
     * Starts a build project and returns an id
     */
    async start(){
        const buildId = await this.client.startBuild({
            projectName: this.name
        }).promise()
        .then(data => data.build?.id);
        if(!buildId){
            throw `No buildId returned when starting codebuild project ${this.name}`;
        }
        return buildId;
    }

    async getBuildStatus(buildId: string){
        const builds = await this.client.batchGetBuilds({
            ids: [buildId]
        }).promise().then(data => data.builds);
        if(builds){
            return builds[0].buildStatus as BuildStatus;
        }
        throw `Could not find any builds with id ${buildId}`;
    }

    async buildWaitComplete(buildId: string, pollInterval=10000){
        return new Promise(resolve => {
            const interval = setInterval(async () => {
                const buildStatus = await this.getBuildStatus(buildId);
                if(buildStatus !== BuildStatus.IN_PROGRESS){
                    if(buildStatus !== BuildStatus.SUCCEEDED){
                        throw `Build ${buildId} in project ${this.name} finished with an invalid status: ${buildStatus}`;
                    }
                    clearInterval(interval);
                    resolve(true);
                }
            }, pollInterval);
        });
    }

    async startAndWait(){
        const buildId = await this.start();
        return this.buildWaitComplete(buildId);
    }
}