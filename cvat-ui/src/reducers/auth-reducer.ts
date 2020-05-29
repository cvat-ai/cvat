// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { boundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { AuthState } from './interfaces';

const defaultState: AuthState = {
    initialized: false,
    fetching: false,
    user: null,
};

export default function (state = defaultState, action: AuthActions | boundariesActions): AuthState {
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
            };
        case AuthActionTypes.LOGIN_FAILED:
            return {
                ...state,
                fetching: false,
            };
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
        case BoundariesActionTypes.RESET_AFTER_ERROR: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
