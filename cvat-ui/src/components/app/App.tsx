import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';

import Dashboard from '../dashboard/Dashboard';

import './App.css';

class App extends Component {
  render() {
    return(
      <Router>
        <div>
          <Redirect from="/" to="dashboard" />
          <Route path="/dashboard" component={Dashboard} />
        </div>
      </Router>
    );
  }
}

export default App;
