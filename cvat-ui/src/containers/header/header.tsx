import React from 'react';
import { connect } from 'react-redux';

import { logoutAsync } from '../../actions/auth-actions';
import {
    SupportedPlugins,
    CombinedState,
} from '../../reducers/interfaces';

import HeaderComponent from '../../components/header/header';

interface StateToProps {
    logoutFetching: boolean;
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    username: string;
}

interface DispatchToProps {
    onLogout(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { auth } = state;
    const { plugins } = state.plugins;
    return {
        logoutFetching: state.auth.fetching,
        installedAnalytics: plugins[SupportedPlugins.ANALYTICS],
        installedAutoAnnotation: plugins[SupportedPlugins.AUTO_ANNOTATION],
        installedTFSegmentation: plugins[SupportedPlugins.TF_SEGMENTATION],
        installedTFAnnotation: plugins[SupportedPlugins.TF_ANNOTATION],
        username: auth.user.username,
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
