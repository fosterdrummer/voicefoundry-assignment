const AWS = require('aws-sdk');

const [region, githubkey, owmkey] = process.argv.slice(2);

AWS.config.region = region;

const secretsManager = new AWS.SecretsManager();

secretsManager.createSecret({
    Name: 'GitHub_PrivateToken',
    SecretString: githubkey
}).promise().then(_ => 
    console.log('Github token uploaded successfully'));

secretsManager.createSecret({
    Name: 'Owm_ApiKey',
    SecretString: owmkey
}).promise().then(_ => 
    console.log('Owm token uploaded successfully'));