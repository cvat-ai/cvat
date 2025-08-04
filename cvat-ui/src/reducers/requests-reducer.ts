// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { AnyAction } from 'redux';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { RequestsActionsTypes } from 'actions/requests-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { SelectionActionsTypes } from 'actions/selection-actions';
import { RequestsState, SelectedResourceType } from '.';

const defaultState: RequestsState = {
    initialized: false,
    fetching: false,
    requests: {},
    cancelled: {},
    selected: [],
    query: {
        page: 1,
        pageSize: 10,
    },
};

export default function (
    state = defaultState,
    action: AnyAction,
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
        case RequestsActionsTypes.CANCEL_REQUEST_SUCCESS: {
            const { request } = action.payload;
            return {
                ...state,
                cancelled: {
                    ...state.cancelled,
                    [request.id]: true,
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
            const { requests, cancelled } = state;

            return {
                ...state,
                requests: {
                    ...requests,
                    [action.payload.request.id]: action.payload.request,
                },
                cancelled: _.omit(cancelled, action.payload.request.id),
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case SelectionActionsTypes.DESELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.REQUESTS) {
                return {
                    ...state,
                    selected: state.selected.filter((id: string) => !action.payload.resourceIds.includes(id)),
                };
            }
            return state;
        }
        case SelectionActionsTypes.SELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.REQUESTS) {
                return {
                    ...state,
                    selected: Array.from(new Set([...state.selected, ...action.payload.resourceIds])),
                };
            }
            return state;
        }
        case SelectionActionsTypes.CLEAR_SELECTED_RESOURCES: {
            return { ...state, selected: [] };
        }
        default: {
            return state;
        }
    }
}
