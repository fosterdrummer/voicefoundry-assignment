import * as cdk from '@aws-cdk/core';
import { AppDeploymentCustomResource } from './custom-resource';
import { AppDeploymentPipelineProps } from './pipeline'
import { AppDeploymentPipelineBuilder } from './pipeline-builder';

export class AppDeployment extends cdk.Resource{
    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps & cdk.ResourceProps){
        super(scope, id, props);
        const pipelineBuilder = new AppDeploymentPipelineBuilder(this, 'Builder', props);
        new AppDeploymentCustomResource(this, 'AppDeploymentCR', {
            pipelineBuilder: pipelineBuilder
        });
    }
}