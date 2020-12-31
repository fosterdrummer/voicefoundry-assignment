import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as cr from '@aws-cdk/custom-resources';
import { AppDeploymentPipelineBuilder } from './pipeline-builder';
const uuid = require('uuid');

const HANDLER_NAME_PREFIX = 'app-deployment';
const HANDLER_SOURCE_PATH = 'custom-resource-handlers/app-deployment';

export interface AppDeploymentCustomResourceProps extends cdk.ResourceProps{
    pipelineBuilder: AppDeploymentPipelineBuilder
}

export class AppDeploymentCustomResource extends cdk.Resource{

    constructor(scope: cdk.Construct, id: string, props: AppDeploymentCustomResourceProps){
        super(scope, id);        

        const {
            pipelineStack,
            pipelineBuildProject
        } = props.pipelineBuilder;

        const {
            frontendBucketName,
            artifactBucketName,
            apiStackName,
            pipelineName
        } = pipelineStack;

        const getRegionalArnPrefix = (serviceName: string) =>
            `arn:aws:${serviceName}:${this.env.region}:${this.env.account}:`

        const getGlobalArnPrefix = (serviceName: string) =>
            `arn:aws:${serviceName}:::`

        const getBucketIamArns = (bucketName: string) => {
            const bucketArn = getGlobalArnPrefix('s3') + `bucket/${bucketName}`;
            return [bucketArn, bucketArn + '/*'];
        }

        const getStackIamArn = (stackName: string) => 
            getRegionalArnPrefix('cloudformation') + `:stack/${stackName}/*`;

        const accessPolicy = new iam.ManagedPolicy(this, 'LambdaProviderPolicy', {
            managedPolicyName: `${HANDLER_NAME_PREFIX}-access`,
            statements: [{
                actions: [
                    "cloudformation:DescribeStackEvents",
                    "cloudformation:DeleteStack",
                    "cloudformation:DescribeStacks"
                ],
                resources: [
                    getStackIamArn(apiStackName),
                    getStackIamArn(pipelineStack.stackName)
                ]
            }, {
                actions: [
                    "codepipeline:StartPipelineExecution",
                    "codepipeline:GetPipelineExecution",
                    "codepipeline:ListPipelineExecutions"
                ],
                resources: [
                    getRegionalArnPrefix('codepipeline') + `:pipeline/${pipelineName}`
                ]
            }, {
                actions: [
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:DeleteObject"
                ],
                resources: [
                    ...getBucketIamArns(frontendBucketName),
                    ...getBucketIamArns(artifactBucketName)
                ]
            }, {
                actions: [
                    "codebuild:StartBuild",
                    "codebuild:BatchGetBuilds"
                ],
                resources: [props.pipelineBuilder.pipelineBuildProject.projectArn]
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
                },
                timeout: cdk.Duration.minutes(15)
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

        console.log(pipelineName);

        new cdk.CustomResource(this, 'AppDeploymentCustomResource', {
            serviceToken: provider.serviceToken,
            resourceType: 'Custom::AppDeployment',
            properties: {
                codePipelineName: pipelineName,
                pipelineStackName: pipelineStack.stackName,
                pipelineBuilderName: pipelineBuildProject.projectName,
                frontendBucketName: frontendBucketName,
                artifactBucketName: artifactBucketName,
                apiStackName: apiStackName,
                uuid: uuid.v4() //Ensure a deployment is ran during every Update
            }
        });
    }
}