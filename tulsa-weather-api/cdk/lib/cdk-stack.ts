import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import * as apiGw from "@aws-cdk/aws-apigateway";
import * as ssm from "@aws-cdk/aws-ssm";

const HttpMethod = {
  GET: 'GET'
}

export interface LambdaApiDeploymentProps extends cdk.StackProps{
  readonly serviceName: string,
  readonly handler: string
  readonly projectPath: string,
  readonly serviceDescription: string
  readonly lambdaEnvironmentVars: {[key: string]: string}
  readonly apiUrlParameterName: string
  stageName?: string
}

export class LambdaApiDeployment extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: LambdaApiDeploymentProps) {
    super(scope, id, props);
    
    const handler = new lambda.Function(this, 'Handler', {
        functionName: `${props.serviceName}-handler`,
        runtime: lambda.Runtime.NODEJS_12_X,
        handler:`src/${props.handler}`,
        code: lambda.Code.fromAsset(`${props.projectPath}`),
        environment: props.lambdaEnvironmentVars
    })
    
    const api = new apiGw.LambdaRestApi(this, 'ServiceApi', {
        handler: handler,
        restApiName: `${props.serviceName}-api`,
        description: props.serviceDescription,
        proxy: false
    })
  
    api.root.addMethod(HttpMethod.GET)

    //To allow retrieval in a buildspec
    new ssm.StringParameter(this, 'CachedApiUrl', {
      parameterName: props.apiUrlParameterName,
      stringValue: api.url
    });
  }
}
