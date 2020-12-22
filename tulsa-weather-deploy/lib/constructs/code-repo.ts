import * as cdk from '@aws-cdk/core'
import { Group } from '@aws-cdk/aws-iam';
import { Repository } from '@aws-cdk/aws-codecommit'

export type CodeRepoProps = {
    readonly repoName: string,
    readonly repoDescription: string
}

export class CodeRepo extends cdk.Construct{

    repoGroup: Group
    repo: Repository

    constructor(scope: cdk.Construct, id: string, props: CodeRepoProps){
        super(scope, id);
        const idWithContext = (stackId: string): string => `${stackId}-${props.repoName}`;
        this.repo = new Repository(this, idWithContext('Repo'), {
            repositoryName: props.repoName,
            description: props.repoDescription
        });
        this.repoGroup = new Group(this, idWithContext('AccessGroup'), {
            groupName: `${props.repoName}-developers`
        });
        this.repo.grantRead(this.repoGroup);
        this.repo.grantPullPush(this.repoGroup);
    }
}