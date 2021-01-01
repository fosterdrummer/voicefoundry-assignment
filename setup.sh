#!/bin/bash
AWS_PROFILE=$1
OWM_KEY=$2
GITHUB_KEY=$3

echo "Switching to 'deploy' project"
cd deploy

#Install dependencies
echo "********************************** Installing cdk **********************************"
npm install -g cdk@1.79.0

echo "********************************** Installing project dependencies **********************************"
npm install

#Build the custom resource handlers
echo "********************************** Building Custom Resource Handlers **********************************"
./scripts/build_custom_resource_handlers.sh

#Create secrets
echo "********************************** Storing Github and OpenWeatherMaps Secrets in AWS Secrets Manager **********************************"
AWS_PROFILE=$AWS_PROFILE node scripts/createSecrets.js $GITHUB_KEY $OWM_KEY

#Bootstrap the cdk
echo "********************************** Bootstraping the CDK to current aws environment **********************************"
cdk bootstrap --profile $AWS_PROFILE

echo "Setup complete."
echo "Deploy the demo using the following command 'cd deploy && cdk deploy TulsaWeatherApp'"