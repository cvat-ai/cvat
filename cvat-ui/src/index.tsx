// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { createRoot } from 'react-dom/client';
import { connect, Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { getAboutAsync } from 'actions/about-actions';
import { authenticatedAsync } from 'actions/auth-actions';
import { getFormatsAsync } from 'actions/formats-actions';
import { getModelsAsync } from 'actions/models-actions';
import { getPluginsAsync } from 'actions/plugins-actions';
import { getUserAgreementsAsync } from 'actions/useragreements-actions';
import CVATApplication from 'components/cvat-app';
import PluginsEntrypoint from 'components/plugins-entrypoint';
import LayoutGrid from 'components/layout-grid/layout-grid';
import logger, { EventScope } from 'cvat-logger';
import createCVATStore, { getCVATStore } from 'cvat-store';
import createRootReducer from 'reducers/root-reducer';
import { activateOrganizationAsync } from 'actions/organization-actions';
import { resetErrors, resetMessages } from 'actions/notification-actions';
import { getInvitationsAsync } from 'actions/invitations-actions';
import { getServerAPISchemaAsync } from 'actions/server-actions';
import { CombinedState, NotificationsState, PluginsState } from './reducers';

createCVATStore(createRootReducer);

const cvatStore = getCVATStore();

interface StateToProps {
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    userInitialized: boolean;
    userFetching: boolean;
    organizationFetching: boolean;
    organizationInitialized: boolean;
    aboutInitialized: boolean;
    aboutFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    userAgreementsInitialized: boolean;
    userAgreementsFetching: boolean;
    notifications: NotificationsState;
    user: any;
    isModelPluginActive: boolean;
    pluginComponents: PluginsState['components'];
    invitationsFetching: boolean;
    invitationsInitialized: boolean;
    serverAPISchemaFetching: boolean;
    serverAPISchemaInitialized: boolean;
    isPasswordResetEnabled: boolean;
    isRegistrationEnabled: boolean;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthenticated: () => void;
    loadAbout: () => void;
    initModels: () => void;
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    loadUserAgreements: () => void;
    loadOrganization: () => void;
    initInvitations: () => void;
    loadServerAPISchema: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        plugins, auth, formats, about, userAgreements, models, organizations, invitations, serverAPI,
    } = state;

    return {
        userInitialized: auth.initialized,
        userFetching: auth.fetching,
        organizationFetching: organizations.fetching,
        organizationInitialized: organizations.initialized,
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
        notifications: state.notifications,
        user: auth.user,
        pluginComponents: plugins.components,
        isModelPluginActive: plugins.list.MODELS,
        invitationsFetching: invitations.fetching,
        invitationsInitialized: invitations.initialized,
        serverAPISchemaFetching: serverAPI.fetching,
        serverAPISchemaInitialized: serverAPI.initialized,
        isPasswordResetEnabled: serverAPI.configuration.isPasswordResetEnabled,
        isRegistrationEnabled: serverAPI.configuration.isRegistrationEnabled,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(getFormatsAsync()),
        verifyAuthenticated: (): void => dispatch(authenticatedAsync()),
        loadUserAgreements: (): void => dispatch(getUserAgreementsAsync()),
        initPlugins: (): void => dispatch(getPluginsAsync()),
        initModels: (): void => dispatch(getModelsAsync()),
        loadAbout: (): void => dispatch(getAboutAsync()),
        resetErrors: (): void => dispatch(resetErrors()),
        resetMessages: (): void => dispatch(resetMessages()),
        loadOrganization: (): void => dispatch(activateOrganizationAsync()),
        initInvitations: (): void => dispatch(getInvitationsAsync({ page: 1 }, true)),
        loadServerAPISchema: (): void => dispatch(getServerAPISchemaAsync()),
    };
}

const ReduxAppWrapper = connect(mapStateToProps, mapDispatchToProps)(CVATApplication);

const root = createRoot(document.getElementById('root') as HTMLDivElement);
root.render((
    <Provider store={cvatStore}>
        <BrowserRouter>
            <PluginsEntrypoint />
            <ReduxAppWrapper />
        </BrowserRouter>
        <LayoutGrid />
    </Provider>
));

window.addEventListener('error', (errorEvent: ErrorEvent): boolean => {
    const {
        filename, lineno, colno, error,
    } = errorEvent;

    if (
        filename && typeof lineno === 'number' &&
        typeof colno === 'number' && error
    ) {
        // weird react behaviour
        // it also gets event only in development environment, caught and handled in componentDidCatch
        // discussion is here https://github.com/facebook/react/issues/10474
        // and workaround is:
        if (error.stack && error.stack.indexOf('invokeGuardedCallbackDev') >= 0) {
            return true;
        }

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
        const re = /\/tasks\/[0-9]+\/jobs\/[0-9]+$/;
        const { instance: job } = state.annotation.job;
        if (re.test(pathname) && job) {
            job.logger.log(EventScope.exception, logPayload);
        } else {
            logger.log(EventScope.exception, logPayload);
        }
    }

    return false;
});
