// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { Dispatch, ActionCreator } from 'redux';
import { Indexable, WebhooksQuery } from 'reducers/interfaces';
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

export const getWebhooksAsync = (query: WebhooksQuery): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(webhooksActions.getWebhooks(query));

        // We remove all keys with null values from the query
        const filteredQuery = { ...query };
        for (const key of Object.keys(query)) {
            if ((filteredQuery as Indexable)[key] === null) {
                delete (filteredQuery as Indexable)[key];
            }
        }

        let result = null;
        try {
            result = await cvat.webhooks.get(filteredQuery);
        } catch (error) {
            dispatch(webhooksActions.getWebhooksFailed(error));
            return;
        }

        const array = Array.from(result);

        dispatch(webhooksActions.getWebhooksSuccess(array, result.count));
    }
);

export type WebhooksActions = ActionUnion<typeof webhooksActions>;
