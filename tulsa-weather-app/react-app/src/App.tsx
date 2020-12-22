import React from 'react';
import './App.css';
import tulsaWeatherClient from './clients/tulsa-weather-client'

type AppState = {
  response: any
}

class App extends React.Component{ 
  state: AppState = {
    response: ''
  }

  componentDidMount(){
    tulsaWeatherClient.getCurrentWeather()
      .then(weather => this.setState({response: JSON.stringify(weather, null, 2)}))
  }

  getResponse(){
    const response = this.state.response
    if(response === ''){
      return 'Waiting for response...'
    }
    return response
  }

  render(){
    return (
      <div>
        <h1>Tulsa Weather App</h1>
        <p>{this.getResponse()}</p>
      </div>
    )
  }
}

export default App;
