import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';

import CVATApplication from './components/cvat-app';

import createRootReducer from './reducers/root-reducer';
import createCVATStore, { getCVATStore } from './store';

import { authorizedAsync } from './actions/auth-actions';
import { getFormatsAsync } from './actions/formats-actions';
import { checkPluginsAsync } from './actions/plugins-actions';
import { getUsersAsync } from './actions/users-actions';
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
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state;
    const { auth } = state;
    const { formats } = state;
    const { users } = state;

    return {
        userInitialized: auth.initialized,
        pluginsInitialized: plugins.initialized,
        pluginsFetching: plugins.fetching,
        usersInitialized: users.initialized,
        usersFetching: users.fetching,
        formatsInitialized: formats.initialized,
        formatsFetching: formats.fetching,
        installedAutoAnnotation: plugins.plugins.AUTO_ANNOTATION,
        installedTFSegmentation: plugins.plugins.TF_SEGMENTATION,
        installedTFAnnotation: plugins.plugins.TF_ANNOTATION,
        notifications: { ...state.notifications },
        user: auth.user,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(getFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        initPlugins: (): void => dispatch(checkPluginsAsync()),
        loadUsers: (): void => dispatch(getUsersAsync()),
        resetErrors: (): void => dispatch(resetErrors()),
        resetMessages: (): void => dispatch(resetMessages()),
    };
}

function reduxAppWrapper(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <CVATApplication {...props} />
    );
}

const ReduxAppWrapper = connect(
    mapStateToProps,
    mapDispatchToProps,
)(reduxAppWrapper);

ReactDOM.render(
    (
        <Provider store={cvatStore}>
            <ReduxAppWrapper />
        </Provider>
    ),
    document.getElementById('root'),
);
