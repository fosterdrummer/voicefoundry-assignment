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
        <h2>Today's Weather in {response.name}</h2>
        <div>
          <h3>{response.weather[0].main}</h3>
          <h3>Current Temp {response.main.temp}</h3>
          <h4>Min</h4>
          <p>{response.main.temp_min}</p>
          <h4>Max</h4>
          <p>{response.main.temp_max}</p>
          <h3>Wind</h3>
          <p>Windspeed is {response.wind.speed} mph with gusts at {response.wind.speed} mph</p>
        </div>
      </div>
    );
  }

  render(){
    return (
      <div className='App'>
        <h1>Tulsa Weather App</h1>
        <div>{this.getResponse()}</div>
      </div>
    );
  }
}

export default App;
