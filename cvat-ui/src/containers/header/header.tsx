// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import getCore from 'cvat-core-wrapper';
import HeaderComponent from 'components/header/header';
import { SupportedPlugins, CombinedState } from 'reducers/interfaces';
import { logoutAsync } from 'actions/auth-actions';
import { switchSettingsDialog } from 'actions/settings-actions';

const core = getCore();

interface StateToProps {
    logoutFetching: boolean;
    installedAnalytics: boolean;
    username: string;
    toolName: string;
    serverHost: string;
    serverVersion: string;
    serverDescription: string;
    coreVersion: string;
    canvasVersion: string;
    uiVersion: string;
    switchSettingsShortcut: string;
    settingsDialogShown: boolean;
}

interface DispatchToProps {
    onLogout: () => void;
    switchSettingsDialog: (show: boolean) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        auth: {
            fetching: logoutFetching,
            user: {
                username,
            },
        },
        plugins: {
            list,
        },
        about: {
            server,
            packageVersion,
        },
        shortcuts: {
            normalizedKeyMap,
        },
        settings: {
            showDialog: settingsDialogShown,
        },
    } = state;

    return {
        logoutFetching,
        installedAnalytics: list[SupportedPlugins.ANALYTICS],
        username,
        toolName: server.name as string,
        serverHost: core.config.backendAPI.slice(0, -7),
        serverDescription: server.description as string,
        serverVersion: server.version as string,
        coreVersion: packageVersion.core,
        canvasVersion: packageVersion.canvas,
        uiVersion: packageVersion.ui,
        switchSettingsShortcut: normalizedKeyMap.SWITCH_SETTINGS,
        settingsDialogShown,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLogout: (): void => dispatch(logoutAsync()),
        switchSettingsDialog: (show: boolean): void => dispatch(switchSettingsDialog(show)),
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(HeaderComponent);
