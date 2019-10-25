import React from 'react';
import { connect } from 'react-redux';

import { logoutAsync } from '../../actions/auth-actions';
import { CombinedState } from '../../reducers/root-reducer';

import HeaderComponent from '../../components/header/header';

interface StateToProps {
    username: string;
    logoutError: any;
}

interface DispatchToProps {
    logout(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        username: state.auth.user.username,
        logoutError: state.auth.logoutError,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        logout: () => dispatch(logoutAsync()),
    }
}

function HeaderContainer(props: StateToProps & DispatchToProps) {
    return (
        <HeaderComponent
            onLogout={props.logout}
            username={props.username}
            logoutError={props.logoutError ? props.logoutError.toString() : ''}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(HeaderContainer);
