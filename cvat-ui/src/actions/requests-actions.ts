// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';
import { CombinedState, RequestsQuery } from 'reducers';
import { Request, ProjectOrTaskOrJob, getCore } from 'cvat-core-wrapper';
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
    CANCEL_REQUEST_FAILED = 'CANCEL_REQUEST_FAILED',
    DELETE_REQUEST = 'DELETE_REQUEST',
    DELETE_REQUEST_FAILED = 'DELETE_REQUEST_FAILED',
    DISABLE_REQUEST = 'DISABLE_REQUEST',
}

export const requestsActions = {
    getRequests: (query: RequestsQuery, fetching = true) => (
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
    cancelRequest: (request: Request) => createAction(RequestsActionsTypes.CANCEL_REQUEST, { request }),
    cancelRequestFailed: (request: Request, error: any) => createAction(
        RequestsActionsTypes.CANCEL_REQUEST_FAILED, { request, error },
    ),
    disableRequest: (request: Request) => createAction(
        RequestsActionsTypes.DISABLE_REQUEST, { request },
    ),
};

export type RequestsActions = ActionUnion<typeof requestsActions>;

export interface RequestInstanceType {
    id: number;
    type: 'project' | 'task' | 'job';
}

export function getInstanceType(instance: ProjectOrTaskOrJob | RequestInstanceType): 'project' | 'task' | 'job' {
    if (instance instanceof core.classes.Project) {
        return 'project';
    }

    if (instance instanceof core.classes.Task) {
        return 'task';
    }

    if (instance instanceof core.classes.Job) {
        return 'job';
    }

    return instance.type;
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
