import React from 'react';
import './App.css';
import TulsaWeatherClient from './clients/tulsa-weather-client';
import { WeatherResponse } from 'openweathermap-api-client';

type AppState = {
  weatherReponse?: WeatherResponse
  apiConfigError: boolean
};

class App extends React.Component{ 
  
  state: AppState = {
    apiConfigError: false
  }

  componentDidMount(){
    try{
      new TulsaWeatherClient().getCurrentWeather()
        .then(weatherResponse => this.setState({weatherReponse: weatherResponse}));
    }
    catch(e){
      console.error(e);
      this.setState({apiConfigError: true});
    }
  }

  getResponse(){
    const response = this.state.weatherReponse;
    if(this.state.apiConfigError){
      return <p>Error: the api is not configured correctly</p>
    }
    if(!response){
      return <p>Waiting on weather response...</p>;
    }
    return (
      <div>
        <h1>Today's Weather in {response}</h1>
      </div>
    );
  }

  render(){
    return (
      <div>
        <h1>Tulsa Weather App</h1>
        <div>{this.getResponse()}</div>
      </div>
    );
  }
}

export default App;
