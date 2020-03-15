// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import CVATApplication from './components/cvat-app';

import createRootReducer from './reducers/root-reducer';
import createCVATStore, { getCVATStore } from './cvat-store';

import { authorizedAsync } from './actions/auth-actions';
import { getFormatsAsync } from './actions/formats-actions';
import { checkPluginsAsync } from './actions/plugins-actions';
import { getUsersAsync } from './actions/users-actions';
import { getAboutAsync } from './actions/about-actions';
import { shortcutsActions } from './actions/shortcuts-actions';
import {
    resetErrors,
    resetMessages,
} from './actions/notification-actions';

import {
    CombinedState,
    NotificationsState,
} from './reducers/interfaces';

createCVATStore(createRootReducer);
const cvatStore = getCVATStore();

interface StateToProps {
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    userInitialized: boolean;
    usersInitialized: boolean;
    usersFetching: boolean;
    aboutInitialized: boolean;
    aboutFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    notifications: NotificationsState;
    user: any;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
    loadUsers: () => void;
    loadAbout: () => void;
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    switchShortcutsDialog: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state;
    const { auth } = state;
    const { formats } = state;
    const { users } = state;
    const { about } = state;

    return {
        userInitialized: auth.initialized,
        pluginsInitialized: plugins.initialized,
        pluginsFetching: plugins.fetching,
        usersInitialized: users.initialized,
        usersFetching: users.fetching,
        aboutInitialized: about.initialized,
        aboutFetching: about.fetching,
        formatsInitialized: formats.initialized,
        formatsFetching: formats.fetching,
        installedAutoAnnotation: plugins.list.AUTO_ANNOTATION,
        installedTFSegmentation: plugins.list.TF_SEGMENTATION,
        installedTFAnnotation: plugins.list.TF_ANNOTATION,
        notifications: state.notifications,
        user: auth.user,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(getFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        initPlugins: (): void => dispatch(checkPluginsAsync()),
        loadUsers: (): void => dispatch(getUsersAsync()),
        loadAbout: (): void => dispatch(getAboutAsync()),
        resetErrors: (): void => dispatch(resetErrors()),
        resetMessages: (): void => dispatch(resetMessages()),
        switchShortcutsDialog: (): void => dispatch(shortcutsActions.switchShortcutsDialog()),
    };
}

const ReduxAppWrapper = connect(
    mapStateToProps,
    mapDispatchToProps,
)(CVATApplication);

ReactDOM.render(
    (
        <Provider store={cvatStore}>
            <BrowserRouter>
                <ReduxAppWrapper />
            </BrowserRouter>
        </Provider>
    ),
    document.getElementById('root'),
);
