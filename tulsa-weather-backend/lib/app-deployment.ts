import * as cdk from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';

export interface AppHostProps extends cdk.StackProps {
  readonly appName: string,
  readonly appIndexFileName: string,
  readonly buildPath: string
}

export class S3AppDeployment extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AppHostProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'HostBucket', {
      bucketName: props.appName,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: props.appIndexFileName
    });

    new BucketDeployment(this, 'AppDeployment', {
      sources: [Source.asset(props.buildPath)],
      retainOnDelete: false,
      destinationBucket: bucket
    })

    new cdk.CfnOutput(this, 'TulsaWeatherAppUrl', {
      value: bucket.bucketWebsiteUrl
    })
  }
}