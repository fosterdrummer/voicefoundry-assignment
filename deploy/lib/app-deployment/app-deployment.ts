import * as cdk from '@aws-cdk/core';
import { AppDeploymentCustomResource } from './custom-resource';
import { AppDeploymentPipelineProps } from './pipeline'
import { AppDeploymentPipelineBuilder } from './pipeline-builder';

/**
 * Creates and executes a code pipeline tailored for a specific app and environment.
 */
export class AppDeployment extends cdk.Construct{
    constructor(scope: cdk.Construct, id: string, props: AppDeploymentPipelineProps){
        super(scope, id);

        const pipelineBuilder = new AppDeploymentPipelineBuilder(this, 'Builder', props);
        
        new AppDeploymentCustomResource(this, 'AppDeploymentCR', {
            pipelineBuilder: pipelineBuilder
        });
    }
}