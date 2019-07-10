import React, { PureComponent } from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import Dashboard from '../dashboard/dashboard';

import { loginAction, logoutAction } from '../../actions/authentication-action';

import './app.scss';

declare const window: any;

const mapDispatchToProps = (dispatch: any) => ({
  login: () => { dispatch(loginAction()) },
  logout: () => { dispatch(logoutAction()) },
})

const mapStateToProps = (state: any) => ({
  ...state.authenticateReducer,
})

class App extends PureComponent<any, any> {
  componentDidMount() {
    window.cvat.server.login(process.env.REACT_APP_LOGIN, process.env.REACT_APP_PASSWORD).then(
      (_response: any) => {
        this.props.login();
      },
      (_error: any) => {
        this.props.logout();
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

export default connect(mapStateToProps, mapDispatchToProps)(App);
