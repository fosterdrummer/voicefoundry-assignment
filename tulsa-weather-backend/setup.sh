#!/bin/bash
PROFILE_NAME=$1

cdk bootstrap --profile $PROFILE_NAME
cdk deploy CodeRepositories --profile $PROFILE_NAME --force