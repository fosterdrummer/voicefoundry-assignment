import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as ssm from '@aws-cdk/aws-ssm';

const HttpMethod = {
    GET: 'GET'
}

export interface ApiStackProps extends cdk.StackProps{
    readonly apiName: string;
    readonly handlerProps: Omit<lambda.FunctionProps, 'code' | 'functionName'>;
}

export class ApiStack extends cdk.Stack{

    lambdaCodeFromParams: lambda.CfnParametersCode;
    apiUrlParameterName: string;
    bucketUrlParameterName: string;

    constructor(scope: cdk.Construct, id: string, props: ApiStackProps){
        super(scope, id, props);
        this.lambdaCodeFromParams = lambda.Code.fromCfnParameters();
        
        const apiHandler = new lambda.Function(this, 'ApiHandler', {
            code: this.lambdaCodeFromParams,
            functionName: `${props.apiName}-handler`,
            ...props.handlerProps,
        });

        const api = new apiGw.LambdaRestApi(this, 'Api', {
            handler: apiHandler,
            restApiName: `${props.apiName}-api`,
            proxy: false,
        });

        api.root.addMethod(HttpMethod.GET);

        this.apiUrlParameterName = `/${props.apiName}/ApiUrl`;
        
        new ssm.StringParameter(this, 'ApiUrlParam', {
            parameterName: this.apiUrlParameterName,
            stringValue: api.url
        });
    }
}