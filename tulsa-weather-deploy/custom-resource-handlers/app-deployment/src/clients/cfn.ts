import AWS from 'aws-sdk';
import { AnyARecord } from 'dns';

export class Stack{
    name: string
    client: AWS.CloudFormation
    constructor(stackName: string){
        this.name = stackName;
        this.client = new AWS.CloudFormation();
    }
    async delete() {
        this.client.deleteStack({
            StackName: this.name
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

    async isDeleted(): Promise<boolean> {
        return this.describe()
            .then(stack => stack === undefined)
    }
}