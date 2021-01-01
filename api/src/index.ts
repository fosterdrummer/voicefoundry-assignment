import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from 'aws-lambda'

import {
    OwmApiClient,
    WeatherResponse
} from 'openweathermap-api-client'

import AWS from 'aws-sdk';

AWS.config.region = process.env.REGION;

const getEnvForTypeScript = function(name: string): string {
    const val = process.env[name];
    return val ? val: '';
}

const OPEN_WEATHER_MAP_SECRET_ID = getEnvForTypeScript('OPEN_WEATHER_MAP_SECRET_ID');
const TULSA_ID = parseInt(getEnvForTypeScript('OPEN_WEATHER_MAP_CITY_ID'));

const getOwmClient = async () => {
    const apiKey = await new AWS.SecretsManager().getSecretValue({
        SecretId: OPEN_WEATHER_MAP_SECRET_ID
    }).promise().then(data => {
        if(!data.SecretString){
            throw 'No secret found';
        }
        return data.SecretString
    });
    return new OwmApiClient(apiKey);
}

const getTodaysWeather = async (): Promise<WeatherResponse> => {
    const owmClient = await getOwmClient();
    return owmClient.current(TULSA_ID)
}

module.exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    
    const todaysWeather = await getTodaysWeather();
    
    return {
        statusCode: todaysWeather.cod,
        body: JSON.stringify(todaysWeather),
        headers: {
            "Access-Control-Allow-Origin": "*",
            'Content-Type': 'application/json'
        }
    };
};