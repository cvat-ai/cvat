// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { WebhooksActions, WebhooksActionsTypes } from 'actions/webhooks-actions';
import { WebhooksState } from './interfaces';

const defaultState: WebhooksState = {
    current: [],
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
            };
        }
        case WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS:
            return {
                ...state,
                fetching: false,
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
