// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { RequestsActionsTypes, RequestsActions } from 'actions/requests-actions';
import { AuthActionTypes, AuthActions } from 'actions/auth-actions';
import { RequestsState } from '.';

const defaultState: RequestsState = {
    initialized: false,
    fetching: false,
    requests: {},
    urls: [],
    query: {
        page: 1,
    },
};

export default function (
    state = defaultState,
    action: RequestsActions | AuthActions | BoundariesActions,
): RequestsState {
    switch (action.type) {
        case RequestsActionsTypes.GET_REQUESTS: {
            const { fetching } = action.payload;
            return {
                ...state,
                fetching,
                query: {
                    ...state.query,
                    ...action.payload.query,
                },
            };
        }
        case RequestsActionsTypes.GET_REQUESTS_SUCCESS: {
            return {
                ...state,
                requests: Object.fromEntries(action.payload.requests.map((r) => [r.id, r])),
                initialized: true,
                fetching: false,
            };
        }
        case RequestsActionsTypes.GET_REQUESTS_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        case RequestsActionsTypes.GET_REQUEST_STATUS_SUCCESS: {
            const { requests } = state;

            return {
                ...state,
                requests: {
                    ...requests,
                    [action.payload.request.id]: action.payload.request,
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
}
