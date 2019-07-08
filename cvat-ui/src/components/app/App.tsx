import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';

import Dashboard from '../dashboard/dashboard';

import './app.scss';

declare const window: any;

interface AppState {
  isLoggedIn: boolean;
}

class App extends Component<any, AppState> {
  constructor(props: any) {
    super(props);

    this.state = {
      isLoggedIn: false
    };
  }

  componentDidMount() {
    window.cvat.server.login('admin', 'admin').then(
      (_response: any) => {
        this.setState({ isLoggedIn: true });
      },
      (_error: any) => {
        this.setState({ isLoggedIn: false });
      }
    );
  }

  render() {
    return(
      <Router>
        <div>
          <Redirect from="/" to="dashboard" />
          <Route path="/dashboard" component={ Dashboard } />
        </div>
      </Router>
    );
  }
}

export default App;
