import React from 'react';
import { connect } from 'react-redux';

import { logoutAsync } from 'actions/auth-actions';
import {
    SupportedPlugins,
    CombinedState,
} from 'reducers/interfaces';

import HeaderComponent from 'components/header/header';

interface StateToProps {
    logoutFetching: boolean;
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    username: string;
    serverAbout: any;
}

interface DispatchToProps {
    onLogout(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { auth } = state;
    const { list } = state.plugins;
    const { about } = state;

    return {
        logoutFetching: state.auth.fetching,
        installedAnalytics: list[SupportedPlugins.ANALYTICS],
        installedAutoAnnotation: list[SupportedPlugins.AUTO_ANNOTATION],
        installedTFSegmentation: list[SupportedPlugins.TF_SEGMENTATION],
        installedTFAnnotation: list[SupportedPlugins.TF_ANNOTATION],
        username: auth.user.username,
        serverAbout: about.server,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLogout: (): void => dispatch(logoutAsync()),
    };
}

function HeaderContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <HeaderComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(HeaderContainer);
