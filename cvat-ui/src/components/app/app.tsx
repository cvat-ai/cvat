import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import { connect } from 'react-redux';
import { login, logout } from '../../actions/auth.actions';

import Dashboard from '../dashboard/dashboard';
import NotFound from '../not-found/not-found';

import './app.scss';

declare const window: any;

class App extends PureComponent<any, any> {
  componentDidMount() {
    window.cvat.server.login(process.env.REACT_APP_LOGIN, process.env.REACT_APP_PASSWORD).then(
      (_response: any) => {
        this.props.dispatch(login(true));
      },
      (_error: any) => {
        this.props.dispatch(logout(false));
      }
    );
  }

  render() {
    return(
      <Router>
        <Switch>
          <Redirect path="/" exact to="/dashboard" />
          <Route path="/dashboard" component={ Dashboard } />
          <Route component={ NotFound } />
        </Switch>
      </Router>
    );
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default connect(mapStateToProps)(App);
