import { AnyAction } from 'redux';
import { AuthActionTypes } from '../actions/auth-actions';

import { AuthState } from './interfaces';

const defaultState: AuthState = {
    initialized: false,
    authError: null,
    loginError: null,
    logoutError: null,
    registerError: null,
    user: null,
};

export default (state = defaultState, action: AnyAction): AuthState => {
    switch (action.type) {
        case AuthActionTypes.AUTHORIZED_SUCCESS:
            return {
                ...state,
                initialized: true,
                user: action.payload.user,
                authError: null,
            };
        case AuthActionTypes.AUTHORIZED_FAILED:
            return {
                ...state,
                initialized: true,
                authError: action.payload.authError,
            };
        case AuthActionTypes.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
                loginError: null,
            };
        case AuthActionTypes.LOGIN_FAILED:
            return {
                ...state,
                user: null,
                loginError: action.payload.loginError,
            };
        case AuthActionTypes.LOGOUT_SUCCESS:
            return {
                ...state,
                user: null,
                logoutError: null,
            };
        case AuthActionTypes.LOGOUT_FAILED:
            return {
                ...state,
                logoutError: action.payload.logoutError,
            };
        case AuthActionTypes.REGISTER_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
                registerError: null,
            };
        case AuthActionTypes.REGISTER_FAILED:
            return {
                ...state,
                user: null,
                registerError: action.payload.registerError,
            };
        default:
            return state;
    }
};
