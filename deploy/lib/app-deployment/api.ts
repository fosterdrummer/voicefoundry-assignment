import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as ssm from '@aws-cdk/aws-ssm';
import * as iam from '@aws-cdk/aws-iam';
import * as sm from '@aws-cdk/aws-secretsmanager';
import { Secret } from '@aws-cdk/aws-secretsmanager';

const HttpMethod = {
    GET: 'GET'
}

export interface ApiStackProps extends cdk.StackProps{
    readonly apiName: string;
    readonly apiSecrets: string[]
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

        const secretArns = props.apiSecrets
            .map(secretName => 
                sm.Secret.fromSecretNameV2(this, `Secret-${secretName}`, secretName))
            .map(secret => secret.secretFullArn as string);

        apiHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
                "secretsmanager:ListSecretVersionIds"
            ],
            resources: secretArns
        }));

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