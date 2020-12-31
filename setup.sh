#!/bin/bash
AWS_PROFILE=$1

cd tulsa-weather-deploy
echo "Installing packages..."
npm install -g cdk
npm install
echo "Compiling custom resource code..."
./build_custom_resources.sh
echo "Bootstraping cdk environment"
cdk bootstrap --profile $AWS_PROFILE