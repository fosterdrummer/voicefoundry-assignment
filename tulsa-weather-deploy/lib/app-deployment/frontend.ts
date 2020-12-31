import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deploy from '@aws-cdk/aws-s3-deployment'


/**
 * This class will allow me to pass the bucket deployment props as cfn parameters
 */
export class FrontEndDeploymentParams{
    bucketNameParam: cdk.CfnParameter
    bucketKeyParam: cdk.CfnParameter
    
    constructor(scope: cdk.Construct){
        this.bucketNameParam = new cdk.CfnParameter(scope, 'FrontendSourceBucketName')
        this.bucketKeyParam = new cdk.CfnParameter(scope, 'FrontendSourceBucketKey')
    }

    assign(location: s3.Location){
        const params: {[name: string]: any} = {}
        params[this.bucketNameParam.logicalId] = location.bucketName
        params[this.bucketKeyParam.logicalId] = location.objectKey
        return params
    }
}

export interface FrontendStackProps extends cdk.StackProps{
    readonly appName: string;
    readonly indexDocument: string;
    readonly errorDocument?: string;
}

export class FrontendStack extends cdk.Stack{

    frontEndDeploymentParams: FrontEndDeploymentParams
    bucketUrlParameterName: string;
    appName: string;

    constructor(scope: cdk.Construct, id: string, props: FrontendStackProps){
        super(scope, id, props);
        this.appName = props.appName;
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `${props.appName}-web`,
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: props.indexDocument,
            websiteErrorDocument: props.errorDocument
        });

        this.frontEndDeploymentParams = new FrontEndDeploymentParams(this);

        const{
            bucketKeyParam,
            bucketNameParam
        } = this.frontEndDeploymentParams;

        const deploymentSourceBucketName = bucketNameParam.valueAsString;
        const deploymentSourceBucket = s3.Bucket.fromBucketName(this, 
            'DeploymentSourceBucket', deploymentSourceBucketName);
        const deploymentSourceKey = bucketKeyParam.valueAsString;

        new s3Deploy.BucketDeployment(this, 'BucketDeployment', {
            destinationBucket: frontendBucket,
            sources: [
                s3Deploy.Source.bucket(deploymentSourceBucket, deploymentSourceKey)
            ],
            retainOnDelete: false
        });
    }
}