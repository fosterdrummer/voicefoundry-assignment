import axios from 'axios'
import config from '../aws_config.json'
import { WeatherResponse } from 'openweathermap-api-client'

class TulsaWeatherClient{
    apiUrl: string = config.LambdaDeployment.apiUrl
    async getCurrentWeather(): Promise<WeatherResponse>{
        return axios.get(this.apiUrl)
            .then(response => response.data as WeatherResponse);
    }
}

export default new TulsaWeatherClient();