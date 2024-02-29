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
    count: 0,
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
            return {
                ...state,
                fetching: true,
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
                count: action.payload.count,
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
        case RequestsActionsTypes.REQUEST_FINISHED: {
            const { request } = action.payload;

            if (request.url) {
                return {
                    ...state,
                    urls: [
                        ...state.urls,
                        request.id,
                    ],
                };
            }
            return {
                ...state,
            };
        }
        case RequestsActionsTypes.GET_REQUESTS_STATUS_SUCCESS:
        case RequestsActionsTypes.GET_REQUESTS_STATUS_FAILED: {
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
