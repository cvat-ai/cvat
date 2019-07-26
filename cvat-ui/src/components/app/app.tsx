import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth.actions';

import Dashboard from '../dashboard/dashboard';
import Login from '../login/login';
import NotFound from '../not-found/not-found';

import './app.scss';


class App extends PureComponent<any, any> {
  componentDidMount() {
    // TODO: remove when proper login flow (with router) will be implemented
    this.props.dispatch(
      loginAsync(
        process.env.REACT_APP_LOGIN as string,
        process.env.REACT_APP_PASSWORD as string,
      ),
    );
  }

  render() {
    return(
      <Router>
        <Switch>
          <Redirect path="/" exact to="/dashboard" />
          <Route path="/dashboard" component={ Dashboard } />
          <Route path="/login" component={ Login } />
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
