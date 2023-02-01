// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, Webhook } from 'cvat-core-wrapper';
import { Dispatch, ActionCreator, Store } from 'redux';
import { WebhooksQuery } from 'reducers';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum WebhooksActionsTypes {
    GET_WEBHOOKS = 'GET_WEBHOOKS',
    GET_WEBHOOKS_SUCCESS = 'GET_WEBHOOKS_SUCCESS',
    GET_WEBHOOKS_FAILED = 'GET_WEBHOOKS_FAILED',
    CREATE_WEBHOOK = 'CREATE_WEBHOOK',
    CREATE_WEBHOOK_SUCCESS = 'CREATE_WEBHOOK_SUCCESS',
    CREATE_WEBHOOK_FAILED = 'CREATE_WEBHOOK_FAILED',
    UPDATE_WEBHOOK = 'UPDATE_WEBHOOK',
    UPDATE_WEBHOOK_SUCCESS = 'UPDATE_WEBHOOK_SUCCESS',
    UPDATE_WEBHOOK_FAILED = 'UPDATE_WEBHOOK_FAILED',
    DELETE_WEBHOOK = 'DELETE_WEBHOOK',
    DELETE_WEBHOOK_SUCCESS = 'DELETE_WEBHOOK_SUCCESS',
    DELETE_WEBHOOK_FAILED = 'DELETE_WEBHOOK_FAILED',
}

const webhooksActions = {
    getWebhooks: (query: WebhooksQuery) => createAction(WebhooksActionsTypes.GET_WEBHOOKS, { query }),
    getWebhooksSuccess: (webhooks: Webhook[], count: number) => createAction(
        WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS, { webhooks, count },
    ),
    getWebhooksFailed: (error: any) => createAction(WebhooksActionsTypes.GET_WEBHOOKS_FAILED, { error }),
    createWebhook: () => createAction(WebhooksActionsTypes.CREATE_WEBHOOK),
    createWebhookSuccess: (webhook: Webhook) => createAction(WebhooksActionsTypes.CREATE_WEBHOOK_SUCCESS, { webhook }),
    createWebhookFailed: (error: any) => createAction(WebhooksActionsTypes.CREATE_WEBHOOK_FAILED, { error }),
    updateWebhook: () => createAction(WebhooksActionsTypes.UPDATE_WEBHOOK),
    updateWebhookSuccess: (webhook: any) => createAction(WebhooksActionsTypes.UPDATE_WEBHOOK_SUCCESS, { webhook }),
    updateWebhookFailed: (error: any) => createAction(WebhooksActionsTypes.UPDATE_WEBHOOK_FAILED, { error }),
    deleteWebhook: () => createAction(WebhooksActionsTypes.DELETE_WEBHOOK),
    deleteWebhookSuccess: () => createAction(WebhooksActionsTypes.DELETE_WEBHOOK_SUCCESS),
    deleteWebhookFailed: (webhookID: number, error: any) => createAction(
        WebhooksActionsTypes.DELETE_WEBHOOK_FAILED, { webhookID, error },
    ),
};

export const getWebhooksAsync = (query: WebhooksQuery): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(webhooksActions.getWebhooks(query));

        const filteredQuery = filterNull(query);

        let result = null;
        try {
            result = await cvat.webhooks.get(filteredQuery);
        } catch (error) {
            dispatch(webhooksActions.getWebhooksFailed(error));
            return;
        }

        const array: Array<Webhook> = Array.from(result);

        dispatch(webhooksActions.getWebhooksSuccess(array, result.count));
    }
);

export function createWebhookAsync(webhookData: Store): ThunkAction {
    return async function (dispatch) {
        const webhook = new cvat.classes.Webhook(webhookData);
        dispatch(webhooksActions.createWebhook());

        try {
            const createdWebhook = await webhook.save();
            dispatch(webhooksActions.createWebhookSuccess(createdWebhook));
        } catch (error) {
            dispatch(webhooksActions.createWebhookFailed(error));
            throw error;
        }
    };
}

export function updateWebhookAsync(webhook: Webhook): ThunkAction {
    return async function (dispatch) {
        dispatch(webhooksActions.updateWebhook());

        try {
            const updatedWebhook = await webhook.save();
            dispatch(webhooksActions.updateWebhookSuccess(updatedWebhook));
        } catch (error) {
            dispatch(webhooksActions.updateWebhookFailed(error));
            throw error;
        }
    };
}

export function deleteWebhookAsync(webhook: Webhook): ThunkAction {
    return async function (dispatch) {
        try {
            await webhook.delete();
            dispatch(webhooksActions.deleteWebhookSuccess());
        } catch (error) {
            dispatch(webhooksActions.deleteWebhookFailed(webhook.id, error));
            throw error;
        }
    };
}

export type WebhooksActions = ActionUnion<typeof webhooksActions>;
