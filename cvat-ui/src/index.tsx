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

import { CombinedState } from './reducers/interfaces';

createCVATStore(createRootReducer);
const cvatStore = getCVATStore();

interface StateToProps {
    pluginsInitialized: boolean;
    userInitialized: boolean;
    usersInitialized: boolean;
    formatsInitialized: boolean;
    gettingAuthError: any;
    gettingFormatsError: any;
    gettingUsersError: any;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    user: any;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
    loadUsers: () => void;
    initPlugins: () => void;
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
        gettingAuthError: auth.authError,
        gettingUsersError: users.gettingUsersError,
        gettingFormatsError: formats.gettingFormatsError,
        installedAutoAnnotation: plugins.plugins.AUTO_ANNOTATION,
        installedTFSegmentation: plugins.plugins.TF_SEGMENTATION,
        installedTFAnnotation: plugins.plugins.TF_ANNOTATION,
        user: auth.user,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(gettingFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        initPlugins: (): void => dispatch(checkPluginsAsync()),
        loadUsers: (): void => dispatch(getUsersAsync()),
    };
}

function reduxAppWrapper(props: StateToProps & DispatchToProps) {
    return (
        <CVATApplication
            initPlugins={props.initPlugins}
            loadFormats={props.loadFormats}
            loadUsers={props.loadUsers}
            verifyAuthorized={props.verifyAuthorized}
            pluginsInitialized={props.pluginsInitialized}
            userInitialized={props.userInitialized}
            usersInitialized={props.usersInitialized}
            formatsInitialized={props.formatsInitialized}
            gettingAuthError={props.gettingAuthError ? props.gettingAuthError.toString() : ''}
            gettingFormatsError={props.gettingFormatsError ? props.gettingFormatsError.toString() : ''}
            gettingUsersError={props.gettingUsersError ? props.gettingUsersError.toString() : ''}
            installedAutoAnnotation={props.installedAutoAnnotation}
            installedTFSegmentation={props.installedTFSegmentation}
            installedTFAnnotation={props.installedTFAnnotation}
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
