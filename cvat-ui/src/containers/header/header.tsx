import React from 'react';
import { connect } from 'react-redux';

import { logoutAsync } from '../../actions/auth-actions';
import {
    SupportedPlugins,
    CombinedState,
} from '../../reducers/interfaces';

import HeaderComponent from '../../components/header/header';

interface StateToProps {
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    username: string;
    logoutError: any;
}

interface DispatchToProps {
    logout(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { auth } = state;
    const { plugins } = state.plugins;
    return {
        installedAnalytics: plugins[SupportedPlugins.ANALYTICS],
        installedAutoAnnotation: plugins[SupportedPlugins.AUTO_ANNOTATION],
        installedTFSegmentation: plugins[SupportedPlugins.TF_SEGMENTATION],
        installedTFAnnotation: plugins[SupportedPlugins.TF_ANNOTATION],
        username: auth.user.username,
        logoutError: auth.logoutError,
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
            installedAnalytics={props.installedAnalytics}
            installedTFAnnotation={props.installedTFAnnotation}
            installedTFSegmentation={props.installedTFSegmentation}
            installedAutoAnnotation={props.installedAutoAnnotation}
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
