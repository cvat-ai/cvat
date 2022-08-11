// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const cvat = getCore();

export enum WebhooksActionsTypes {
    GET_WEBHOOKS = 'GET_WEBHOOKS',
    GET_WEBHOOKS_SUCCESS = 'GET_WEBHOOKS_SUCCESS',
    GET_WEBHOOKS_FAILED = 'GET_WEBHOOKS_FAILED',
}

const webhooksActions = {
    getWebhooks: () => createAction(WebhooksActionsTypes.GET_WEBHOOKS),
    getWebhooksSuccess: (webhooks: any[]) => createAction(
        WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS, { webhooks },
    ),
    getWebhooksFailed: (error: any) => createAction(WebhooksActionsTypes.GET_WEBHOOKS_FAILED, { error }),
};

export function getWebhooksAsync(): ThunkAction {
    return async function (dispatch) {
        dispatch(webhooksActions.getWebhooks());

        let result = null;
        try {
            result = await cvat.webhooks.get();
        } catch (error) {
            dispatch(webhooksActions.getWebhooksFailed(error));
            return;
        }

        const array = Array.from(result);

        dispatch(webhooksActions.getWebhooksSuccess(array));
    };
}

export type WebhooksActions = ActionUnion<typeof webhooksActions>;
