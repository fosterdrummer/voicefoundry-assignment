import * as cdk from "@aws-cdk/core";
import { CodeRepo } from "./constructs/code-repo";
import { User } from "@aws-cdk/aws-iam";

export interface SourceControlProps extends cdk.StackProps{
    readonly repoName: string
}

export class SourceControl extends cdk.Stack{

    codeRepo: CodeRepo

    constructor(scope: cdk.Construct, id: string, props: SourceControlProps){
        super(scope, id, props);
        this.codeRepo = new CodeRepo(this, 'Repo', {
            repoName: props.repoName,
            repoDescription: 'Repository for the tulsa-weather-app project'
        });

        const demoUser = new User(this, 'DemoUser', {
            userName: `${props.repoName}-demo-user`
        });
        
        demoUser.addToGroup(this.codeRepo.repoGroup);
    }
}