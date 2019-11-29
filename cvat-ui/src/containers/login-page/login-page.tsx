import React from 'react';
import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth-actions';
import LoginPageComponent from '../../components/login-page/login-page';
import { CombinedState } from '../../reducers/interfaces';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    login(username: string, password: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        login: (...args) => dispatch(loginAsync(...args)),
    };
}

function LoginPageContainer(props: DispatchToProps & StateToProps) {
    return (
        <LoginPageComponent
            fetching={props.fetching}
            onLogin={props.login}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPageContainer);
