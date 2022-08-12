// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { WebhooksQuery } from 'reducers/interfaces';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const cvat = getCore();

export enum WebhooksActionsTypes {
    GET_WEBHOOKS = 'GET_WEBHOOKS',
    GET_WEBHOOKS_SUCCESS = 'GET_WEBHOOKS_SUCCESS',
    GET_WEBHOOKS_FAILED = 'GET_WEBHOOKS_FAILED',
}

const webhooksActions = {
    getWebhooks: (query: WebhooksQuery) => createAction(WebhooksActionsTypes.GET_WEBHOOKS, { query }),
    getWebhooksSuccess: (webhooks: any[], count: number) => createAction(
        WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS, { webhooks, count },
    ),
    getWebhooksFailed: (error: any) => createAction(WebhooksActionsTypes.GET_WEBHOOKS_FAILED, { error }),
};

export function getWebhooksAsync(query: WebhooksQuery): ThunkAction {
    return async function (dispatch) {
        dispatch(webhooksActions.getWebhooks(query));

        let result = null;
        try {
            result = await cvat.webhooks.get(query);
        } catch (error) {
            dispatch(webhooksActions.getWebhooksFailed(error));
            return;
        }

        const array = Array.from(result);

        dispatch(webhooksActions.getWebhooksSuccess(array, result.count));
    };
}

export type WebhooksActions = ActionUnion<typeof webhooksActions>;
