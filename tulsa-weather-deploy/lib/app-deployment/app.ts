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
    frontendBucket: Bucket
    appName: string;

    constructor(scope: cdk.Construct, id: string, props: AppStackProps){
        super(scope, id, props);
        
        this.appName = props.appName;
        this.generateApiResources(props);
        this.generateFrontendResources(props);
    }

    generateFrontendResources(props: AppStackProps){
        this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `${props.appName}-web`,
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: props.indexDocument,
            websiteErrorDocument: props.errorDocument
        });

        this.bucketUrlParameterName = `/${props.appName}/BucketUrl`

        new ssm.StringParameter(this, 'BucketUrlParam', {
            parameterName: this.bucketUrlParameterName,
            stringValue: this.frontendBucket.bucketWebsiteUrl
        });
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