import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deploy from '@aws-cdk/aws-s3-deployment';

export interface S3AppDeploymentProps extends cdk.StackProps{
  readonly appName: string,
  readonly appIndexFileName: string,
  readonly buildPath: string
}

export class S3AppDeployment extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: S3AppDeploymentProps) {
    super(scope, id, props);
    const bucket = new s3.Bucket(this, 'HostBucket', {
      bucketName: props.appName,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: props.appIndexFileName
    });
    
    new s3Deploy.BucketDeployment(this, 'AppDeployment', {
      sources: [s3Deploy.Source.asset(props.buildPath)],
      retainOnDelete: false,
      destinationBucket: bucket
    })
    new cdk.CfnOutput(this, 'AppUrl', {
      value: bucket.bucketWebsiteUrl
    })
  }
}
