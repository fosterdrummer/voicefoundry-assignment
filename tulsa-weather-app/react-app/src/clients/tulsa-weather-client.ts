import axios from 'axios'
import config from '../apiConfig.json'
import { WeatherResponse } from 'openweathermap-api-client'

class TulsaWeatherClient{
    apiUrl: string = config.TulsaWeatherApiDeployment.apiUrl
    async getCurrentWeather(): Promise<WeatherResponse>{
        return axios.get(this.apiUrl)
            .then(response => response.data as WeatherResponse);
    }
}

export default new TulsaWeatherClient();