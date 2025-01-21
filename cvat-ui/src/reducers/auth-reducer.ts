// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { AuthState } from '.';

const defaultState: AuthState = {
    initialized: false,
    fetching: false,
    user: null,
    showChangePasswordDialog: false,
    hasEmailVerificationBeenSent: false,
};

export default function (state = defaultState, action: AuthActions | BoundariesActions): AuthState {
    switch (action.type) {
        case AuthActionTypes.AUTHENTICATED_REQUEST:
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        case AuthActionTypes.AUTHENTICATED_SUCCESS:
            return {
                ...state,
                initialized: true,
                fetching: false,
                user: action.payload.user,
            };
        case AuthActionTypes.AUTHENTICATED_FAILED:
            return {
                ...state,
                fetching: false,
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
                initialized: false,
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
                showChangePasswordDialog: action.payload.visible,
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
        case BoundariesActionTypes.RESET_AFTER_ERROR: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
