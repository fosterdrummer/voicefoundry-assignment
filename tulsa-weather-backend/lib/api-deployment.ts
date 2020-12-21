import * as cdk from '@aws-cdk/core';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'

const HttpMethod = {
    GET: "GET"
}

export interface ServiceDeploymentProps extends cdk.StackProps {
    readonly serviceName: string,
    readonly handler: string
    readonly projectPath: string,
    readonly serviceDescription: string
}

export class LambdaApiServiceDeployment extends cdk.Stack{
    
    apiUrl: cdk.CfnOutput

    constructor(scope: cdk.Construct, id: string, props: ServiceDeploymentProps) {
        super(scope, id, props);

        const lambda = new Function(this, 'Handler', {
            functionName: `${props.serviceName}-handler`,
            runtime: Runtime.NODEJS_12_X,
            handler:`src/${props.handler}`,
            code: Code.fromAsset(`${props.projectPath}`)
        })

        const api = new LambdaRestApi(this, 'ServiceApi', {
            handler: lambda,
            restApiName: `${props.serviceName}-api`,
            description: props.serviceDescription,
            proxy: false
        })
        
         api.root.addMethod(HttpMethod.GET)
    
        this.apiUrl = new cdk.CfnOutput(this, 'apiUrl', {
            value: api.url
        })
    }
}

