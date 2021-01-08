// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { getAboutAsync } from 'actions/about-actions';
import { authorizedAsync, loadAuthActionsAsync } from 'actions/auth-actions';
import { getFormatsAsync } from 'actions/formats-actions';
import { getModelsAsync } from 'actions/models-actions';
import { getPluginsAsync } from 'actions/plugins-actions';
import { switchSettingsDialog } from 'actions/settings-actions';
import { shortcutsActions } from 'actions/shortcuts-actions';
import { getUserAgreementsAsync } from 'actions/useragreements-actions';
import CVATApplication from 'components/cvat-app';
import LayoutGrid from 'components/layout-grid/layout-grid';
import logger, { LogType } from 'cvat-logger';
import createCVATStore, { getCVATStore } from 'cvat-store';
import React from 'react';
import ReactDOM from 'react-dom';
import { ExtendedKeyMapOptions } from 'react-hotkeys';
import { connect, Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import createRootReducer from 'reducers/root-reducer';
import { resetErrors, resetMessages } from './actions/notification-actions';
import { CombinedState, NotificationsState } from './reducers/interfaces';

createCVATStore(createRootReducer);
const cvatStore = getCVATStore();

interface StateToProps {
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    userInitialized: boolean;
    userFetching: boolean;
    aboutInitialized: boolean;
    aboutFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    userAgreementsInitialized: boolean;
    userAgreementsFetching: boolean;
    authActionsFetching: boolean;
    authActionsInitialized: boolean;
    allowChangePassword: boolean;
    allowResetPassword: boolean;
    notifications: NotificationsState;
    user: any;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    isModelPluginActive: boolean;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
    loadAbout: () => void;
    initModels: () => void;
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    switchShortcutsDialog: () => void;
    loadUserAgreements: () => void;
    switchSettingsDialog: () => void;
    loadAuthActions: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state;
    const { auth } = state;
    const { formats } = state;
    const { about } = state;
    const { shortcuts } = state;
    const { userAgreements } = state;
    const { models } = state;

    return {
        userInitialized: auth.initialized,
        userFetching: auth.fetching,
        pluginsInitialized: plugins.initialized,
        pluginsFetching: plugins.fetching,
        modelsInitialized: models.initialized,
        modelsFetching: models.fetching,
        aboutInitialized: about.initialized,
        aboutFetching: about.fetching,
        formatsInitialized: formats.initialized,
        formatsFetching: formats.fetching,
        userAgreementsInitialized: userAgreements.initialized,
        userAgreementsFetching: userAgreements.fetching,
        authActionsFetching: auth.authActionsFetching,
        authActionsInitialized: auth.authActionsInitialized,
        allowChangePassword: auth.allowChangePassword,
        allowResetPassword: auth.allowResetPassword,
        notifications: state.notifications,
        user: auth.user,
        keyMap: shortcuts.keyMap,
        isModelPluginActive: plugins.list.MODELS,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(getFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        loadUserAgreements: (): void => dispatch(getUserAgreementsAsync()),
        initPlugins: (): void => dispatch(getPluginsAsync()),
        initModels: (): void => dispatch(getModelsAsync()),
        loadAbout: (): void => dispatch(getAboutAsync()),
        resetErrors: (): void => dispatch(resetErrors()),
        resetMessages: (): void => dispatch(resetMessages()),
        switchShortcutsDialog: (): void => dispatch(shortcutsActions.switchShortcutsDialog()),
        switchSettingsDialog: (): void => dispatch(switchSettingsDialog()),
        loadAuthActions: (): void => dispatch(loadAuthActionsAsync()),
    };
}

const ReduxAppWrapper = connect(mapStateToProps, mapDispatchToProps)(CVATApplication);

ReactDOM.render(
    <Provider store={cvatStore}>
        <BrowserRouter>
            <ReduxAppWrapper />
        </BrowserRouter>
        <LayoutGrid />
    </Provider>,
    document.getElementById('root'),
);

window.addEventListener('error', (errorEvent: ErrorEvent) => {
    if (
        errorEvent.filename &&
        typeof errorEvent.lineno === 'number' &&
        typeof errorEvent.colno === 'number' &&
        errorEvent.error
    ) {
        const logPayload = {
            filename: errorEvent.filename,
            line: errorEvent.lineno,
            message: errorEvent.error.message,
            column: errorEvent.colno,
            stack: errorEvent.error.stack,
        };

        const store = getCVATStore();
        const state: CombinedState = store.getState();
        const { pathname } = window.location;
        const re = RegExp(/\/tasks\/[0-9]+\/jobs\/[0-9]+$/);
        const { instance: job } = state.annotation.job;
        if (re.test(pathname) && job) {
            job.logger.log(LogType.sendException, logPayload);
        } else {
            logger.log(LogType.sendException, logPayload);
        }
    }
});
