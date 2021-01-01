const AWS = require('aws-sdk');

const [region, githubkey, owmkey] = process.argv.slice(2);

AWS.config.region = region;

const secretsManager = new AWS.SecretsManager();

secretsManager.createSecret({
    Name: 'GitHubVFPrivateToken',
    SecretString: githubkey
}).promise().then(_ => 
    console.log('Github token uploaded successfully'));

secretsManager.createSecret({
    Name: 'OwmApiKey',
    SecretString: owmkey
}).promise().then(_ => 
    console.log('Owm token uploaded successfully'));