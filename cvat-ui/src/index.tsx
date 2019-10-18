import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';

import CVATApplication from './components/cvat-app';
import createCVATStore from './store';

import { authorizedAsync } from './actions/auth-actions';
import { gettingFormatsAsync } from './actions/formats-actions';

import { CombinedState } from './reducers/root-reducer';

const cvatStore = createCVATStore();

interface StateToProps {
    userInitialized: boolean;
    formatsInitialized: boolean;
    gettingAuthError: any;
    gettingFormatsError: any;
    user: any;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { auth } = state;
    const { formats } = state;

    return {
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
        verifyAuthorized: (): void => dispatch(authorizedAsync())
    };
}

function reduxAppWrapper(props: StateToProps & DispatchToProps) {
    return (
        <CVATApplication
            loadFormats={props.loadFormats}
            verifyAuthorized={props.verifyAuthorized}
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
