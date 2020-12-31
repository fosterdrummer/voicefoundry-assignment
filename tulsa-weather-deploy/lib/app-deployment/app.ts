import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from '@aws-cdk/aws-s3';
import { Bucket } from '@aws-cdk/aws-s3';

const HttpMethod = {
    GET: 'GET'
}

export interface AppStackProps extends cdk.StackProps{
    readonly appName: string;
    readonly handlerProps: Omit<lambda.FunctionProps, 'code' | 'functionName'>;
    readonly indexDocument: string;
    readonly errorDocument?: string;
}

export class AppStack extends cdk.Stack{

    lambdaCodeFromParams: lambda.CfnParametersCode;
    apiUrlParameterName: string;
    bucketUrlParameterName: string;
    appName: string;

    constructor(scope: cdk.Construct, id: string, props: AppStackProps){
        super(scope, id, props);
        this.appName = props.appName;
        this.generateApiResources(props);
    }

    generateApiResources(props: AppStackProps){
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