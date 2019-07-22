import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import Dashboard from '../dashboard/dashboard';

import { login, logout } from '../../actions/auth.actions';

import './app.scss';

declare const window: any;

class App extends PureComponent<any, any> {
  componentDidMount() {
    window.cvat.server.login(process.env.REACT_APP_LOGIN, process.env.REACT_APP_PASSWORD).then(
      (_response: any) => {
        this.props.dispatch(login());
      },
      (_error: any) => {
        this.props.dispatch(logout());
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

export default connect()(App);
