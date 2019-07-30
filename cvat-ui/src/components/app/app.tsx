import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import { connect } from 'react-redux';

import Dashboard from '../dashboard/dashboard';
import Login from '../login/login';
import NotFound from '../not-found/not-found';

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
          <ProtectedRoute path="/dashboard" component={ Dashboard } />
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
