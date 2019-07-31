import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import { connect } from 'react-redux';

import DashboardPage from '../dashboard-page/dashboard-page';
import LoginPage from '../login-page/login-page';
import RegisterPage from '../register-page/register-page';
import PageNotFound from '../page-not-found/page-not-found';

import './app.scss';


const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  return (
    <Route
      { ...rest }
      render={ (props) => {
        return localStorage.getItem('session') ? (
          <Component { ...props } />
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: {
                from: props.location,
              },
            }}
          />
        );
      } }
    />
  );
};

class App extends PureComponent<any, any> {
  render() {
    return(
      <Router>
        <Switch>
          <Redirect path="/" exact to="/dashboard" />
          <ProtectedRoute path="/dashboard" component={ DashboardPage } />
          <Route path="/login" component={ LoginPage } />
          <Route path="/register" component={ RegisterPage } />
          <Route component={ PageNotFound } />
        </Switch>
      </Router>
    );
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default connect(mapStateToProps)(App);
