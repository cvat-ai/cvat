// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { AuthState } from '.';

const defaultState: AuthState = {
    initialized: false,
    fetching: false,
    user: null,
    authActionsFetching: false,
    authActionsInitialized: false,
    allowChangePassword: false,
    showChangePasswordDialog: false,
    allowResetPassword: false,
    hasEmailVerificationBeenSent: false,
    socialAuthFetching: false,
    socialAuthInitialized: false,
    socialAuthMethods: [],
    ssoIDPSelectFetching: false,
    ssoIDPSelected: false,
    ssoIDP: null,
};

export default function (state = defaultState, action: AuthActions | BoundariesActions): AuthState {
    switch (action.type) {
        case AuthActionTypes.AUTHORIZED_SUCCESS:
            return {
                ...state,
                initialized: true,
                user: action.payload.user,
            };
        case AuthActionTypes.AUTHORIZED_FAILED:
            return {
                ...state,
                initialized: true,
            };
        case AuthActionTypes.LOGIN:
            return {
                ...state,
                fetching: true,
            };
        case AuthActionTypes.LOGIN_SUCCESS:
            return {
                ...state,
                fetching: false,
                user: action.payload.user,
                hasEmailVerificationBeenSent: false,
            };
        case AuthActionTypes.LOGIN_FAILED: {
            const { hasEmailVerificationBeenSent } = action.payload;
            return {
                ...state,
                fetching: false,
                hasEmailVerificationBeenSent,
            };
        }
        case AuthActionTypes.LOGOUT:
            return {
                ...state,
                fetching: true,
            };
        case AuthActionTypes.LOGOUT_SUCCESS:
            return {
                ...state,
                fetching: false,
                user: null,
            };
        case AuthActionTypes.REGISTER:
            return {
                ...state,
                fetching: true,
                user: null,
            };
        case AuthActionTypes.REGISTER_SUCCESS:
            return {
                ...state,
                fetching: false,
                user: action.payload.user,
            };
        case AuthActionTypes.REGISTER_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.CHANGE_PASSWORD:
            return {
                ...state,
                fetching: true,
            };
        case AuthActionTypes.CHANGE_PASSWORD_SUCCESS:
            return {
                ...state,
                fetching: false,
                showChangePasswordDialog: false,
            };
        case AuthActionTypes.CHANGE_PASSWORD_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.SWITCH_CHANGE_PASSWORD_DIALOG:
            return {
                ...state,
                showChangePasswordDialog:
                    typeof action.payload.showChangePasswordDialog === 'undefined' ?
                        !state.showChangePasswordDialog :
                        action.payload.showChangePasswordDialog,
            };
        case AuthActionTypes.REQUEST_PASSWORD_RESET:
            return {
                ...state,
                fetching: true,
            };
        case AuthActionTypes.REQUEST_PASSWORD_RESET_SUCCESS:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.REQUEST_PASSWORD_RESET_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.RESET_PASSWORD:
            return {
                ...state,
                fetching: true,
            };
        case AuthActionTypes.RESET_PASSWORD_SUCCESS:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.RESET_PASSWORD_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.LOAD_AUTH_ACTIONS:
            return {
                ...state,
                authActionsFetching: true,
            };
        case AuthActionTypes.LOAD_AUTH_ACTIONS_SUCCESS:
            return {
                ...state,
                authActionsFetching: false,
                authActionsInitialized: true,
                allowChangePassword: action.payload.allowChangePassword,
                allowResetPassword: action.payload.allowResetPassword,
            };
        case AuthActionTypes.LOAD_AUTH_ACTIONS_FAILED:
            return {
                ...state,
                authActionsFetching: false,
                authActionsInitialized: true,
                allowChangePassword: false,
                allowResetPassword: false,
            };
        case AuthActionTypes.LOAD_SOCIAL_AUTHENTICATION: {
            return {
                ...state,
                socialAuthFetching: true,
                socialAuthInitialized: false,
            };
        }
        case AuthActionTypes.LOAD_SOCIAL_AUTHENTICATION_SUCCESS: {
            const { methods } = action.payload;
            return {
                ...state,
                socialAuthFetching: false,
                socialAuthInitialized: true,
                socialAuthMethods: methods,
            };
        }
        case AuthActionTypes.LOAD_SOCIAL_AUTHENTICATION_FAILED: {
            return {
                ...state,
                socialAuthFetching: false,
                socialAuthInitialized: true,
            };
        }
        case AuthActionTypes.SELECT_IDENTITY_PROVIDER: {
            return {
                ...state,
                ssoIDPSelectFetching: true,
                ssoIDPSelected: false,
            };
        }
        case AuthActionTypes.SELECT_IDENTITY_PROVIDER_SUCCESS: {
            const { identityProviderID } = action.payload;
            return {
                ...state,
                ssoIDPSelectFetching: false,
                ssoIDPSelected: true,
                ssoIDP: identityProviderID,
            };
        }
        case AuthActionTypes.SELECT_IDENTITY_PROVIDER_FAILED: {
            return {
                ...state,
                ssoIDPSelectFetching: false,
                ssoIDPSelected: true,
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
