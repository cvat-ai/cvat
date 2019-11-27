import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';

import CVATApplication from './components/cvat-app';

import createRootReducer from './reducers/root-reducer';
import createCVATStore, { getCVATStore } from './store';

import { authorizedAsync } from './actions/auth-actions';
import { gettingFormatsAsync } from './actions/formats-actions';
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
    userInitialized: boolean;
    usersInitialized: boolean;
    formatsInitialized: boolean;
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
        pluginsInitialized: plugins.initialized,
        userInitialized: auth.initialized,
        usersInitialized: users.initialized,
        formatsInitialized: formats.initialized,
        installedAutoAnnotation: plugins.plugins.AUTO_ANNOTATION,
        installedTFSegmentation: plugins.plugins.TF_SEGMENTATION,
        installedTFAnnotation: plugins.plugins.TF_ANNOTATION,
        notifications: {...state.notifications},
        user: auth.user,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(gettingFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        initPlugins: (): void => dispatch(checkPluginsAsync()),
        loadUsers: (): void => dispatch(getUsersAsync()),
        resetErrors: (): void => dispatch(resetErrors()),
        resetMessages: (): void => dispatch(resetMessages()),
    };
}

function reduxAppWrapper(props: StateToProps & DispatchToProps) {
    return (
        <CVATApplication
            initPlugins={props.initPlugins}
            loadFormats={props.loadFormats}
            loadUsers={props.loadUsers}
            verifyAuthorized={props.verifyAuthorized}
            resetErrors={props.resetErrors}
            resetMessages={props.resetMessages}
            pluginsInitialized={props.pluginsInitialized}
            userInitialized={props.userInitialized}
            usersInitialized={props.usersInitialized}
            formatsInitialized={props.formatsInitialized}
            installedAutoAnnotation={props.installedAutoAnnotation}
            installedTFSegmentation={props.installedTFSegmentation}
            installedTFAnnotation={props.installedTFAnnotation}
            notifications={props.notifications}
            user={props.user}
        />
    )
}

const ReduxAppWrapper = connect(
    mapStateToProps,
    mapDispatchToProps,
)(reduxAppWrapper);

ReactDOM.render(
    (
        <Provider store={cvatStore}>
            <ReduxAppWrapper/>
        </Provider>
    ),
    document.getElementById('root')
)
