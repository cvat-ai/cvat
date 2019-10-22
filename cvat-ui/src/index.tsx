import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';

import CVATApplication from './components/cvat-app';
import createCVATStore from './store';

import { authorizedAsync } from './actions/auth-actions';
import { gettingFormatsAsync } from './actions/formats-actions';
import { checkPluginsAsync } from './actions/plugins-actions';

import { CombinedState } from './reducers/root-reducer';

const cvatStore = createCVATStore();

interface StateToProps {
    pluginsInitialized: boolean;
    userInitialized: boolean;
    formatsInitialized: boolean;
    gettingAuthError: any;
    gettingFormatsError: any;
    user: any;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
    initPlugins: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state;
    const { auth } = state;
    const { formats } = state;

    return {
        pluginsInitialized: plugins.initialized,
        userInitialized: auth.initialized,
        formatsInitialized: formats.initialized,
        gettingAuthError: auth.authError,
        user: auth.user,
        gettingFormatsError: formats.gettingFormatsError,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(gettingFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync()),
        initPlugins: (): void => dispatch(checkPluginsAsync()),
    };
}

function reduxAppWrapper(props: StateToProps & DispatchToProps) {
    return (
        <CVATApplication
            initPlugins={props.initPlugins}
            loadFormats={props.loadFormats}
            verifyAuthorized={props.verifyAuthorized}
            pluginsInitialized={props.pluginsInitialized}
            userInitialized={props.userInitialized}
            formatsInitialized={props.formatsInitialized}
            gettingAuthError={props.gettingAuthError ? props.gettingAuthError.toString() : ''}
            gettingFormatsError={props.gettingFormatsError ? props.gettingFormatsError.toString() : ''}
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
