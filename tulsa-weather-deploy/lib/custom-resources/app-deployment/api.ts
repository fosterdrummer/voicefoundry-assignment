import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as ssm from '@aws-cdk/aws-ssm';

const HttpMethod = {
    GET: 'GET'
}

export type ApiHandlerProps = Omit<Omit<lambda.FunctionProps, 'code'>,'functionName'>;

export interface LambdaApiStageProps extends cdk.StackProps{
    readonly stageName: string,
    readonly serviceName: string
    handlerProps: ApiHandlerProps
    apiCreationCallback?(handler: lambda.Function, api: apiGw.LambdaRestApi): void
}

export class LambdaApiStage extends cdk.Stack{

    lambdaCodeFromParams: lambda.CfnParametersCode
    apiUrlParameterName: string

    constructor(scope: cdk.Construct, id: string, props: LambdaApiStageProps){
        super(scope, id, props);
        const deploymentName = `${props.serviceName}-${props.stageName}`;
        this.lambdaCodeFromParams = lambda.Code.fromCfnParameters();
        const handler = new lambda.Function(this, 'Handler', {
            code: this.lambdaCodeFromParams,
            functionName: `${deploymentName}--handler`,
            ...props.handlerProps,
        });
        const api = new apiGw.LambdaRestApi(this, 'ServiceApi', {
            handler: handler,
            restApiName: `${deploymentName}-api`,
            proxy: false,
        });
        api.root.addMethod(HttpMethod.GET);

        props.apiCreationCallback && 
        props.apiCreationCallback(handler, api);

        this.apiUrlParameterName = `/${deploymentName}/ApiUrl`

        new ssm.StringParameter(this, 'ApiUrlParam', {
            parameterName: this.apiUrlParameterName,
            stringValue: api.url
        })
    }
}