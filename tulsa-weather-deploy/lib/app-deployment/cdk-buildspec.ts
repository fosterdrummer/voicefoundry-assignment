import { BuildSpec } from "@aws-cdk/aws-codebuild";

export type CdkBuildSpecProps = {
    cdkProjectRoot?: string;
    deployCommands: string[];
    stackArtifacts: string[];
}

export function cdkBuildSpec(props: CdkBuildSpecProps){
    var projectRoot = '${CODEBUILD_SRC_DIR}'
    if(props.cdkProjectRoot){
        projectRoot += `/${props.cdkProjectRoot}`
    }
    const artifactDir = `${projectRoot}/cdk.out`;
    const switchToRoot = `cd ${projectRoot}`;
    return BuildSpec.fromObject({
        version: '0.2',
        phases: {
            install: {
                runtime_versions: { nodejs: 12 },
                commands: [switchToRoot, 'npm install']
            },
            build: { 
                commands: [
                    switchToRoot, 
                    ...props.deployCommands
                ] 
            }
        },
        artifacts: { 
            'base-directory': artifactDir,
            files: props.stackArtifacts.map(name => 
                `${name}.template.json`) 
        }
    });
}