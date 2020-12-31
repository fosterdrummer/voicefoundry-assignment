import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as ssm from '@aws-cdk/aws-ssm';

const HttpMethod = {
    GET: 'GET'
}

export interface AppStackProps extends cdk.StackProps{
    readonly appName: string;
    readonly handlerProps: Omit<lambda.FunctionProps, 'code' | 'functionName'>;
}

export class ApiStack extends cdk.Stack{

    lambdaCodeFromParams: lambda.CfnParametersCode;
    apiUrlParameterName: string;
    appName: string;

    constructor(scope: cdk.Construct, id: string, props: AppStackProps){
        super(scope, id, props);
        this.appName = props.appName;
        this.lambdaCodeFromParams = lambda.Code.fromCfnParameters();
        
        const apiHandler = new lambda.Function(this, 'ApiHandler', {
            code: this.lambdaCodeFromParams,
            functionName: `${props.appName}-handler`,
            ...props.handlerProps,
        });

        const api = new apiGw.LambdaRestApi(this, 'Api', {
            handler: apiHandler,
            restApiName: `${props.appName}-api`,
            proxy: false,
        });

        api.root.addMethod(HttpMethod.GET);

        this.apiUrlParameterName = `/${props.appName}/ApiUrl`;
        
        new ssm.StringParameter(this, 'ApiUrlParam', {
            parameterName: this.apiUrlParameterName,
            stringValue: api.url
        });
    }
}