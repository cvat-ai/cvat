import React from 'react';
import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth-actions';
import LoginPageComponent from '../../components/login-page/login-page';
import { CombinedState } from '../../reducers/interfaces';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    onLogin(username: string, password: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLogin: (...args): void => dispatch(loginAsync(...args)),
    };
}

function LoginPageContainer(props: DispatchToProps & StateToProps): JSX.Element {
    return (
        <LoginPageComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPageContainer);
