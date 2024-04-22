// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { FormatsActionTypes, FormatsActions } from 'actions/formats-actions';
import { AuthActionTypes, AuthActions } from 'actions/auth-actions';

import { FormatsState } from '.';

const defaultState: FormatsState = {
    annotationFormats: null,
    initialized: false,
    fetching: false,
};

export default (
    state: FormatsState = defaultState,
    action: FormatsActions | AuthActions | BoundariesActions,
): FormatsState => {
    switch (action.type) {
        case FormatsActionTypes.GET_FORMATS: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case FormatsActionTypes.GET_FORMATS_SUCCESS:
            return {
                ...state,
                initialized: true,
                fetching: false,
                annotationFormats: action.payload.annotationFormats,
            };
        case FormatsActionTypes.GET_FORMATS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
};
