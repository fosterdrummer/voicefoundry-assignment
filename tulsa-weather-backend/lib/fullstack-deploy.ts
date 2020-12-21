import * as cdk from "@aws-cdk/core";
import { Provider } from "@aws-cdk/custom-resources";
import { Function, Runtime, Code } from "@aws-cdk/aws-lambda";
import { RetentionDays } from "@aws-cdk/aws-logs";

export interface FullStackDeployProps extends cdk.StackProps{
    readonly resourceName: string
    readonly projectPath: string
    readonly handler: string  
}

export class FullStackDeploy extends cdk.Stack{
    constructor(scope: cdk.Construct, id: string, props: FullStackDeployProps){
        super(scope, id, props);
        const onEvent = new Function(this, 'CfnEventHandler', {
            functionName: `on-${props.resourceName}`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(props.projectPath),
            handler: `build/${props.handler}`
        })

        const provider = new Provider(this, 'FullStackDeployCRProvider', {
            onEventHandler: onEvent,
            logRetention: RetentionDays.ONE_DAY
        })

        new cdk.CustomResource(this, 'FullStackDeployCR', {
            serviceToken: provider.serviceToken
        })

    }
}