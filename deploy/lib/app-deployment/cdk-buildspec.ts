import { BuildSpec } from "@aws-cdk/aws-codebuild";

export type CdkBuildSpecProps = {
    cdkProjectRoot?: string;
    deployCommands: string[];
    stackArtifacts?: string[];
}

/**
 * This function is used to simply the buildspec
 * configuration for cdk stack deployments in code build.
 * 
 * @param props.cdkProjectRoot
 * - the relative path to the cdk project you want to synth/deploy
 * - the project root will default to the code commit source root if not set
 * @param props.deployCommands
 * - the command necessary to synth/deploy a cdk stack
 * @param props.stackArtifacts
 * - the stack names who's cloudformation templates you would like
 * to include in the output artifact
 */
export function cdkBuildSpec(props: CdkBuildSpecProps){
    var projectRoot = '${CODEBUILD_SRC_DIR}'
    if(props.cdkProjectRoot){
        projectRoot += `/${props.cdkProjectRoot}`
    }
    const artifactDir = `${projectRoot}/cdk.out`;
    const switchToRoot = `cd ${projectRoot}`;
    const buildSpecObject: any = {
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
        }
    };

    if(props.stackArtifacts){
        buildSpecObject.artifacts = { 
            'base-directory': artifactDir,
            files: props.stackArtifacts.map(name => 
                `${name}.template.json`) 
        }
    }

    return BuildSpec.fromObject(buildSpecObject);
}