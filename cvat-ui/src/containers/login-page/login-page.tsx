import React from 'react';
import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth-actions';
import { CombinedState } from '../../reducers/root-reducer';
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

function LoginPageContainer(props: StateToProps & DispatchToProps) {
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
