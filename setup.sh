#!/bin/bash
AWS_PROFILE=$1
OWM_KEY=$2
GITHUB_KEY=$3

cd deploy

#Install dependencies
npm install -g cdk
npm install

#Build the custom resource handlers
./scripts/build_custom_resource_handlers.sh

#Create secrets
node scripts/createSecrets.js $GITHUB_KEY $OWM_KEY

#Bootstrap the cdk
cdk bootstrap --profile $AWS_PROFILE
