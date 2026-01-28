// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { createRoot } from 'react-dom/client';
import { connect, Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';
import duration from 'dayjs/plugin/duration';

import { getAboutAsync } from 'actions/about-actions';
import { authenticatedAsync } from 'actions/auth-actions';
import { getFormatsAsync } from 'actions/formats-actions';
import { getModelsAsync } from 'actions/models-actions';
import { getPluginsAsync } from 'actions/plugins-actions';
import { getUserAgreementsAsync } from 'actions/useragreements-actions';
import CVATApplication from 'components/cvat-app';
import PluginsEntrypoint from 'components/plugins-entrypoint';
import LayoutGrid from 'components/layout-grid/layout-grid';
import { logError } from 'cvat-logger';
import createCVATStore, { getCVATStore } from 'cvat-store';
import createRootReducer from 'reducers/root-reducer';
import { activateOrganizationAsync } from 'actions/organization-actions';
import { resetErrors, resetMessages } from 'actions/notification-actions';
import { getInvitationsAsync } from 'actions/invitations-actions';
import { getRequestsAsync } from 'actions/requests-async-actions';
import { getServerAPISchemaAsync } from 'actions/server-actions';
import { navigationActions } from 'actions/navigation-actions';
import { CombinedState, NotificationsState, PluginsState } from './reducers';
import './utils/dayjs-wrapper';

createCVATStore(createRootReducer);

const cvatStore = getCVATStore();

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(duration);

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
    requestsFetching: boolean;
    requestsInitialized: boolean;
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
    initRequests: () => void;
    loadServerAPISchema: () => void;
    onChangeLocation: (from: string, to: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        plugins, auth, formats, about, userAgreements, models, organizations, invitations, serverAPI, requests,
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
        requestsFetching: requests.fetching,
        requestsInitialized: requests.initialized,
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
        initInvitations: (): void => dispatch(getInvitationsAsync({}, true)),
        initRequests: (): void => dispatch(getRequestsAsync()),
        loadServerAPISchema: (): void => dispatch(getServerAPISchemaAsync()),
        onChangeLocation: (from: string, to: string): void => dispatch(navigationActions.changeLocation(from, to)),
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

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logError(event.reason, false, { type: 'unhandledrejection' });
});

window.addEventListener('error', (errorEvent: ErrorEvent) => {
    logError(errorEvent.error, false, { type: 'error' });
});
