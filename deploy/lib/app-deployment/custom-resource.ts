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

        const onEventHandler = new lambda.SingletonFunction(this, `CustomResourceOnEventHandler`, {
            uuid: `${HANDLER_NAME_PREFIX}-on-event-handler`,
            handler: `build/on-event.handler`,
            code: lambda.Code.fromAsset(HANDLER_SOURCE_PATH),
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                REGION: this.env.region
            },
            timeout: cdk.Duration.minutes(15)
        });
        
        onEventHandler.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

        const provider = new cr.Provider(this, 'AppDeploymentCustomResourceProvider', {
            onEventHandler: onEventHandler
        });

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