import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from 'aws-lambda'

import {
    OwmApiClient,
    WeatherResponse
} from 'openweathermap-api-client'

const getEnvForTypeScript = function(name: string): string {
    const val = process.env[name];
    return val ? val: '';
}

const WEATHER_API_KEY = getEnvForTypeScript('OPEN_WEATHER_MAP_API_KEY');
const TULSA_ID = parseInt(getEnvForTypeScript('OPEN_WEATHER_MAP_CITY_ID'));

const ownClient = new OwmApiClient({
    apiKey: WEATHER_API_KEY,
    units: 'imperial',
})

const getTodaysWeather = async (): Promise<WeatherResponse> => {
    return ownClient.current(TULSA_ID)
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