import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from 'aws-lambda'

import {
    OwmApiClient,
    WeatherResponse
} from 'openweathermap-api-client'

const WEATHER_API_KEY = '113161f05470d59fa6f2c364d7f2a897'
const TULSA_ID = 4553433

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