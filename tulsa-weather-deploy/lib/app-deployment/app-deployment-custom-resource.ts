import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as cr from '@aws-cdk/custom-resources';
const uuid = require('uuid');

const HANDLER_NAME_PREFIX = 'app-deployment';
const HANDLER_SOURCE_PATH = 'custom-resource-handlers/app-deployment';


export class AppDeployment extends cdk.Resource{

    constructor(scope: cdk.Construct, id: string){
        super(scope, id);        

        /*
        const accessPolicy = new iam.ManagedPolicy(this, 'LambdaProviderPolicy', {
            managedPolicyName: `${HANDLER_NAME_PREFIX}-access`,
            statements: [{
                actions: [
                    "cloudformation:DescribeStackEvents",
                    "cloudformation:DeleteStack",
                    "cloudformation:DescribeStacks"
                ],
                resources: [
                    `arn:aws:cloudformation:${this.env.region}:${this.env.account}:stack/${deployment.appStack.stackName}/*`
                ]
            }, {
                actions: [
                    "codepipeline:StartPipelineExecution",
                    "codepipeline:GetPipelineExecution",
                    "codepipeline:ListPipelineExecutions"
                ],
                resources: [
                    deployment.pipeline.pipelineArn
                ]
            }, {
                actions: [
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:DeleteObject"
                ],
                resources: [
                    deployment.frontendBucket.bucketArn,
                    deployment.frontendBucket.bucketArn + '/*',
                    deployment.artifactBucket.bucketArn,
                    deployment.artifactBucket.bucketArn + '/*',
                ]
            }].map(actionsAndResources => new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                ...actionsAndResources
            }))
        });
        
        
        const getAppDeploymentHandler = (name: string) => {
            const lambdaFunction = new lambda.SingletonFunction(this, `CustomResourceHandler-${name}`, {
                uuid: `${HANDLER_NAME_PREFIX}-${name}-handler`,
                handler: `build/${name}.handler`,
                code: lambda.Code.fromAsset(HANDLER_SOURCE_PATH),
                runtime: lambda.Runtime.NODEJS_10_X,
                environment: {
                    REGION: this.env.region
                }
            });
            lambdaFunction.role?.addManagedPolicy(accessPolicy);
            return lambdaFunction;
        }

        const provider = new cr.Provider(this, 'AppDeploymentCustomResourceProvider', {
            onEventHandler: getAppDeploymentHandler('on-event'),
            isCompleteHandler: getAppDeploymentHandler('is-complete'),
            totalTimeout: cdk.Duration.hours(1),
            queryInterval: cdk.Duration.seconds(10)
        });

        new cdk.CustomResource(this, 'AppDeploymentCustomResource', {
            serviceToken: provider.serviceToken,
            resourceType: 'Custom::AppDeployment',
            properties: {
                codePipelineName: props.pipeline.pipelineName,
                frontendBucketName: props.frontendHostBucket.bucketName,
                frontendBucketUrl: props.frontendHostBucket.bucketWebsiteUrl,
                artifactBucketName: props.artifactBucket.bucketName,
                apiStackName: apiStackDeploymentName,
                uuid: uuid.v4() //Ensure a deployment is ran during every Update
            }
        }); */
    }
}