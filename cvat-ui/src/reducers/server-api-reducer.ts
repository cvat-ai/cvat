// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { ServerAPIActions, ServerAPIActionTypes } from 'actions/server-actions';
import { ServerAPIState } from '.';

const defaultState: ServerAPIState = {
    schema: null,
    fetching: false,
    initialized: false,
    configuration: {
        isRegistrationEnabled: true,
        isBasicLoginEnabled: true,
        isPasswordResetEnabled: true,
        isPasswordChangeEnabled: true,
    },
};

export default function (
    state: ServerAPIState = defaultState,
    action: ServerAPIActions | BoundariesActions,
): ServerAPIState {
    switch (action.type) {
        case ServerAPIActionTypes.GET_SERVER_API_SCHEMA: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case ServerAPIActionTypes.GET_SERVER_API_SCHEMA_SUCCESS: {
            const { schema } = action.payload;
            const isRegistrationEnabled = Object.keys(schema.paths).includes('/api/auth/register');
            const isBasicLoginEnabled = Object.keys(schema.paths).includes('/api/auth/login');
            const isPasswordResetEnabled = Object.keys(schema.paths).includes('/api/auth/password/reset');
            const isPasswordChangeEnabled = Object.keys(schema.paths).includes('/api/auth/password/change');

            return {
                ...state,
                fetching: false,
                initialized: true,
                schema,
                configuration: {
                    isRegistrationEnabled,
                    isBasicLoginEnabled,
                    isPasswordResetEnabled,
                    isPasswordChangeEnabled,
                },
            };
        }
        case ServerAPIActionTypes.GET_SERVER_API_SCHEMA_FAILED: {
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR: {
            return {
                ...defaultState,
            };
        }
        default:
            return state;
    }
}
