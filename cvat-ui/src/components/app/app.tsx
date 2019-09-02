import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import { connect } from 'react-redux';

import HeaderLayout from '../header-layout/header-layout';

import TasksPage from '../tasks-page/tasks-page';
import LoginPage from '../login-page/login-page';
import RegisterPage from '../register-page/register-page';
import PageNotFound from '../page-not-found/page-not-found';

import './app.scss';


const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  return (
    <Route
      { ...rest }
      render={ (props) => {
        return rest.isAuthenticated ? (
          <>
            <HeaderLayout />
            <Component { ...props } />
          </>
        ) : (
          <Redirect
            to={{
              pathname: '/login',
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
  componentDidMount() {
    (window as any).cvat.config.backendAPI = process.env.REACT_APP_API_FULL_URL;
  }

  render() {
    return(
      <Router>
        <Switch>
          <Redirect path="/" exact to="/tasks" />
          <ProtectedRoute isAuthenticated={ this.props.isAuthenticated } path="/tasks" component={ TasksPage } />
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
