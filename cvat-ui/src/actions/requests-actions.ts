// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';
import { CombinedState, RequestsQuery } from 'reducers';
import { Request, getCore } from 'cvat-core-wrapper';
import { Store } from 'redux';
import { getCVATStore } from 'cvat-store';

const core = getCore();
let store: null | Store<CombinedState> = null;
function getStore(): Store<CombinedState> {
    if (store === null) {
        store = getCVATStore();
    }
    return store;
}

export enum RequestsActionsTypes {
    GET_REQUESTS = 'GET_REQUESTS',
    GET_REQUESTS_SUCCESS = 'GET_REQUESTS_SUCCESS',
    GET_REQUESTS_FAILED = 'GET_REQUESTS_FAILED',
    GET_REQUEST_STATUS_SUCCESS = 'GET_REQUEST_STATUS_SUCCESS',
    REQUEST_FINISHED = 'REQUEST_FINISHED',
    REQUEST_FAILED = 'REQUEST_FAILED',
    CANCEL_REQUEST = 'CANCEL_REQUEST',
    CANCEL_REQUEST_SUCCESS = 'CANCEL_REQUEST_SUCCESS',
    CANCEL_REQUEST_FAILED = 'CANCEL_REQUEST_FAILED',
    DELETE_REQUEST = 'DELETE_REQUEST',
    DELETE_REQUEST_FAILED = 'DELETE_REQUEST_FAILED',
    DISABLE_REQUEST = 'DISABLE_REQUEST',
}

export const requestsActions = {
    getRequests: (query: Partial<RequestsQuery>, fetching = true) => (
        createAction(RequestsActionsTypes.GET_REQUESTS, { query, fetching })
    ),
    requestFinished: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FINISHED, { request }),
    requestFailed: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FAILED, { request }),
    getRequestsSuccess: (requests: Awaited<ReturnType<typeof core['requests']['list']>>) => createAction(
        RequestsActionsTypes.GET_REQUESTS_SUCCESS, { requests },
    ),
    getRequestsFailed: (error: any) => createAction(RequestsActionsTypes.GET_REQUESTS_FAILED, {
        error,
    }),
    getRequestStatusSuccess: (request: Request) => (
        createAction(RequestsActionsTypes.GET_REQUEST_STATUS_SUCCESS, {
            request,
        })
    ),
    cancelRequest: () => createAction(RequestsActionsTypes.CANCEL_REQUEST, { }),
    cancelRequestSuccess: (request: Request) => createAction(
        RequestsActionsTypes.CANCEL_REQUEST_SUCCESS, { request },
    ),
    cancelRequestFailed: (request: Request, error: any) => createAction(
        RequestsActionsTypes.CANCEL_REQUEST_FAILED, { request, error },
    ),
};

export type RequestsActions = ActionUnion<typeof requestsActions>;

export interface RequestInstanceType {
    id: number;
    type: 'project' | 'task' | 'job';
}

export function updateRequestProgress(request: Request, dispatch: (action: RequestsActions) => void): void {
    dispatch(
        requestsActions.getRequestStatusSuccess(request),
    );
}

export function listen(
    requestID: string,
    dispatch: (action: RequestsActions) => void,
) : Promise<Request> {
    const { requests } = getStore().getState().requests;
    return core.requests.listen(requestID, {
        callback: (updatedRequest) => {
            updateRequestProgress(updatedRequest, dispatch);
        },
        initialRequest: requests[requestID],
    });
}
