import AWS from 'aws-sdk';

export class Stack{
    
    name: string
    client: AWS.CloudFormation

    constructor(stackName: string){
        this.name = stackName;
        this.client = new AWS.CloudFormation();
    }

    async delete(){
        console.log(`Deleting stack ${this.name}`)
        return this.client.deleteStack({
            StackName: this.name
        }).promise()
    }

    async describe(){
        return this.client.describeStacks({
            StackName: this.name
        }).promise()
        .then(data => 
            data.Stacks && data.Stacks[0]);
    }

    async isDeleted(){
        return this.describe()
            .then(_ => true)
            .catch(_ => false);
    }
}