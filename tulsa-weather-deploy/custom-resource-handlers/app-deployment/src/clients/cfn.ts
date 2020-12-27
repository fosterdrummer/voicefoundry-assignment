import AWS from 'aws-sdk';

export class Stack{
    name: string
    client: AWS.CloudFormation
    constructor(stackName: string){
        this.name = stackName;
        this.client = new AWS.CloudFormation();
    }
    
    async isDeleted(): Promise<boolean> {
        return this.describe()
            .then(stack => stack === undefined)
    }

    async delete(deleteWaiterInterval = 10000) {
        this.client.deleteStack({
            StackName: this.name
        });
        await new Promise(resolve => {
            const waitInterval = setInterval(() => {
                this.describe().then(stack => {
                    if(stack === undefined){
                        clearInterval(waitInterval);
                        resolve(true);
                    }
                });
            }, deleteWaiterInterval);
        })
    }

    async describe(): Promise<AWS.CloudFormation.Stack | undefined> {
        return this.client.describeStacks({
            StackName: this.name
        }).promise().then(data => {
            const stacks = data.Stacks
            return stacks ? stacks[0]: undefined
        });
    }
}