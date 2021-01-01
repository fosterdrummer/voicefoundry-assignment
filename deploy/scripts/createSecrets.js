process.env.AWS_SDK_LOAD_CONFIG=true;

const AWS = require('aws-sdk');
const { exit } = require('process');

const [githubkey, owmkey] = process.argv.slice(2);

const secretsManager = new AWS.SecretsManager();

const withErrorLog = promise => 
    promise.catch(error => {
        console.error(error.message);
        exit(-1);
    });

withErrorLog(
    secretsManager.createSecret({
        Name: 'GitHub_PrivateToken',
        SecretString: githubkey
    }).promise().then(_ => 
        console.log('Github token uploaded successfully'))
);

withErrorLog(
    secretsManager.createSecret({
        Name: 'Owm_ApiKey',
        SecretString: owmkey
    }).promise().then(_ => 
        console.log('Owm token uploaded successfully'))
);