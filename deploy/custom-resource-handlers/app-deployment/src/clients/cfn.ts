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

    async waitStackDeleteComplete(){
        return this.client.waitFor('stackDeleteComplete', {
            StackName: this.name
        }).promise();
    }

    async deleteAndWait(){
        await this.delete();
        return this.waitStackDeleteComplete();
    }
}