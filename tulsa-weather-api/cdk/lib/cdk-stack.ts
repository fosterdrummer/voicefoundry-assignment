import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import * as apiGw from "@aws-cdk/aws-apigateway";

const HttpMethod = {
  GET: 'GET'
}

export interface LambdaApiDeploymentProps extends cdk.StackProps{
  readonly serviceName: string,
  readonly handler: string
  readonly projectPath: string,
  readonly serviceDescription: string
  stageName?: string
}

export class LambdaApiDeployment extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: LambdaApiDeploymentProps) {
    super(scope, id, props);

    if(!props.stageName) props.stageName = ''    

    const handler = new lambda.Function(this, 'Handler', {
        functionName: `${props.serviceName}${props.stageName}-handler`,
        runtime: lambda.Runtime.NODEJS_12_X,
        handler:`src/${props.handler}`,
        code: lambda.Code.fromAsset(`${props.projectPath}`)
    })
    
    const api = new apiGw.LambdaRestApi(this, 'ServiceApi', {
        handler: handler,
        restApiName: `${props.serviceName}${props.stageName}-api`,
        description: props.serviceDescription,
        proxy: false
    })
  
    api.root.addMethod(HttpMethod.GET)

    new cdk.CfnOutput(this, 'ApiUrl', {
        value: api.url
    })
  }
}
