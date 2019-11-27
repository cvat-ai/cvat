import React from 'react';
import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth-actions';
import LoginPageComponent from '../../components/login-page/login-page';

interface StateToProps {}

interface DispatchToProps {
    login(username: string, password: string): void;
}

function mapStateToProps(): StateToProps {
    return {};
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        login: (...args) => dispatch(loginAsync(...args)),
    };
}

function LoginPageContainer(props: DispatchToProps) {
    return (
        <LoginPageComponent
            onLogin={props.login}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPageContainer);
