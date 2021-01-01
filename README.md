# Hunter's VoiceFoundry Assignment

## What do I need before getting started?
### node.js
You will need to have node.js installed on your machine before starting the demo. 
node.js v10.15.3 or later should work

### AWS
You will need an AWS account setup prior to running the demo.
This account should have a user configured with Admin access.

#### AWS Profiles
This project requires an aws profile in ~.aws/config to retrieve environment config and credentials. Pass the profile name to scripts that require aws credentials.

### Secrets

Secrets will be stored in AWS Secrets Manager after being passed to the setup script described in the next section.

You should have the following secrets in hand before starting the demo.

#### Github Private Key
A github private key will be provided with the assignment submission. 
#### OpenWeatherMap Api Key
You will need to setup an OpenWeatherMap api key before starting the demo. [Click here](https://openweathermap.org/appid) for more information regarding signup and key retrieval.


## How do I run this thing?

### Setup
I have provided a setup script in the root of this project.

The script will do the following:
- Install the cdk
- Install dependencies for the 'deploy' project
- Build the custom resource handlers
- Store the secrets in AWS Secrets Manager
- Run cdk bootstrap against your target aws profile

Use the following command to get things setup:
```shell
    ./setup.sh <Your aws profile name> <OpenWeatherMapApiKey> <Github Private Token>
```

### Deploy
Will everything setup on your local machine, it's time to deploy to AWS!

Run the following commands to get the party started
```shell
    cd deploy
    cdk deploy TulsaWeatherApp --profile <Your AWS Profile>
```

The stack deployment will fail if the TulsaWeatherApp is not deployed successfully.

### Clean up
Run the following command in the 'deploy' project to clean up the app resources: 
```shell
    cdk destroy TulsaWeatherApp
```
*** NOTE: ***You will need to delete the secrets manually after the TulsaWeatherApp stack is destroyed.

## How does it work?

This project implements an AppDeployment Construct, which uses a codebuild project and Cloudformation custom resource to execute the following actions during a Cloudformation Create/Update event:
- Create/Update a code pipeline configured to deploy a given app and to a target environment
- Deploy the app using the generated code pipeline

*** A Quick Note: *** Making updates to an AppDeployment's properties will require you to push an update to GitHub before executing a stack update. Pushing your changes to github will ensure that the pipelinebuilder and code pipeline use the latest code when making updates. 

The AppDeployment Construct will then execute the following actions during a Cloudformation Delete event:
- Delete contents from the app and artifact buckets
- Delete the app's api gateway stack
- Delete the app's pipeline stack

The AppDeployment Construct will fail if the the code pipeline finishes in a FAILED state during a deployment, or if other errors occure while creating/deleting downstream stacks.

The AppDeployment Construct will produce the following infrastructure when deployed:
![Look like the image didn't load :(](vf-assignment-arch.jpg?raw=true "High level Architecture")
