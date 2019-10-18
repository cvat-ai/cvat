import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';

import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Modal,
} from 'antd';

import LoginForm, { LoginData } from '../../components/login-page/login-form';

import { loginAsync } from '../../actions/auth-actions';

import { CombinedState } from '../../reducers/root-reducer';
import { AuthState } from '../../reducers/interfaces';

import LoginPageComponent from '../../components/login-page/login-page';

interface StateToProps {
    loginError: any;
}

interface DispatchToProps {
    login(username: string, password: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        loginError: state.auth.loginError,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        login: (...args) => dispatch(loginAsync(...args)),
    };
}

type LoginPageProps = StateToProps & DispatchToProps & RouteComponentProps;

function LoginPageContainer(props: LoginPageProps) {
    return (
        <LoginPageComponent
            onLogin={props.login}
            loginError={props.loginError ? props.loginError.toString() : ''}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPageContainer);
