# Hunter's VoiceFoundry Assignment

# What do I need before getting started?
## node.js
You will need to have node.js installed on your machine before starting the demo. 
node.js v10.15.3 or later should work

## AWS
You will need an AWS account setup prior to running the demo.
This account should have a user configured with Admin access.

### AWS Profiles
This project requires an aws profile in ~.aws/config to retrieve environment config and credentials. Pass the profile name to any scripts that require aws credentials.

# Secrets

Secrets will be stored in AWS Secrets Manager after being passed to the 'doDemo' script described in the next section.

You should have the following secrets in hand before starting the demo.

## Github Private Key
A github private key will be provided with the assignment submission. 
## OpenWeatherMap Api Key
You will need to setup an OpenWeatherMap api key before starting the demo. [Click here](https://openweathermap.org/appid) for more information regarding signup and key retrieval.


# How do I run this thing?

## Setup
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

## Deploy
Will everything setup on your local machine, it's time to deploy to AWS!

Run the following commands to get the part started
```shell
    cd deploy
    cdk deploy TulsaWeatherApp --profile <Your AWS Profile>
```

The TulsaWeatherApp stack uses an AppDeployment custom resource to:
- Create a code pipeline configured the deploy the tulsa weather app
- Execute the pipeline (For Create and Update events)
- Wait for the pipeline to complete successfully

The stack will fail if the TulsaWeatherApp code pipeline does not complete successfully.

# Clean up
Run the following command in the 'deploy' project to clean up the app resources: 
```shell
    cdk destroy TulsaWeatherApp
```
You will need to delete the secrets manually after the TulsaWeatherApp stack is destroyed.
