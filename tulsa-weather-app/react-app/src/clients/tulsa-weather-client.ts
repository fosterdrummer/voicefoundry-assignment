import axios from 'axios'
import { WeatherResponse } from 'openweathermap-api-client'

export default class TulsaWeatherClient{
    
    apiUrl: string

    constructor(){
        console.log(process.env.REACT_APP_TEST_MESSAGE);
        this.apiUrl = ((): string => {
            const url = process.env.REACT_APP_OWM_API_URL;
            if(!url){
                throw "tulsa-weather-api url is not set in the environment.";
            }
            return url;
        })();
    }

    async getCurrentWeather(): Promise<WeatherResponse>{
        return axios.get(this.apiUrl)
            .then(response => response.data as WeatherResponse);
    }
}