// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { WebhooksActions, WebhooksActionsTypes } from 'actions/webhooks-actions';
import { WebhooksState } from 'reducers';

const defaultState: WebhooksState = {
    current: [],
    totalCount: 0,
    query: {
        page: 1,
        id: null,
        projectId: null,
        search: null,
        filter: null,
        sort: null,
    },
    fetching: false,
};

export default function (
    state: WebhooksState = defaultState,
    action: WebhooksActions | AuthActions,
): WebhooksState {
    switch (action.type) {
        case WebhooksActionsTypes.GET_WEBHOOKS: {
            return {
                ...state,
                fetching: true,
                query: {
                    ...state.query,
                    ...action.payload.query,
                },
            };
        }
        case WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS:
            return {
                ...state,
                fetching: false,
                totalCount: action.payload.count,
                current: action.payload.webhooks,
            };
        case WebhooksActionsTypes.GET_WEBHOOKS_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
