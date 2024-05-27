// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';
import { RequestsQuery } from 'reducers';
import { Request, InstanceType, getCore } from 'cvat-core-wrapper';

const core = getCore();

export enum RequestsActionsTypes {
    GET_REQUESTS = 'GET_REQUESTS',
    GET_REQUESTS_SUCCESS = 'GET_REQUESTS_SUCCESS',
    GET_REQUESTS_FAILED = 'GET_REQUESTS_FAILED',
    GET_REQUEST_STATUS_SUCCESS = 'GET_REQUEST_STATUS_SUCCESS',
    GET_REQUEST_STATUS_FAILED = 'GET_REQUEST_STATUS_FAILED',
    REQUEST_FINISHED = 'REQUEST_FINISHED',
    REQUEST_FAILED = 'REQUEST_FAILED',
    CANCEL_REQUEST = 'CANCEL_REQUEST',
    CANCEL_REQUEST_FAILED = 'CANCEL_REQUEST_FAILED',
    DELETE_REQUEST = 'DELETE_REQUEST',
    DELETE_REQUEST_FAILED = 'DELETE_REQUEST_FAILED',
}

export const requestsActions = {
    getRequests: (query?: RequestsQuery) => createAction(RequestsActionsTypes.GET_REQUESTS, { query }),
    requestFinished: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FINISHED, { request }),
    requestFailed: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FAILED, { request }),
    getRequestsSuccess: (requests: Request[]) => createAction(
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
    getRequestStatusFailed: (request: Request, error: any) => (
        createAction(RequestsActionsTypes.GET_REQUEST_STATUS_FAILED, {
            request,
            error,
        })
    ),
    cancelRequest: (request: Request) => createAction(RequestsActionsTypes.CANCEL_REQUEST, { request }),
    cancelRequestFailed: (request: Request, error: any) => createAction(
        RequestsActionsTypes.CANCEL_REQUEST_FAILED, { request, error },
    ),
};

export type RequestsActions = ActionUnion<typeof requestsActions>;

export interface RequestInstanceType {
    id: number;
    type: 'project' | 'task' | 'job';
    requestPromise: Promise<Request>;
}

export function getInstanceType(instance: InstanceType | RequestInstanceType): 'project' | 'task' | 'job' {
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

export function isRequestInstanceType(instance: InstanceType | RequestInstanceType): instance is RequestInstanceType {
    return 'id' in instance && 'type' in instance && 'requestPromise' in instance;
}

export function isInstanceType(instance: any): instance is InstanceType {
    return instance instanceof core.classes.Project ||
            instance instanceof core.classes.Task ||
            instance instanceof core.classes.Job;
}

export function updateRequestProgress(request: Request, dispatch: (action: RequestsActions) => void): void {
    dispatch(
        requestsActions.getRequestStatusSuccess(request),
    );
}

export function listen(
    requestID: string,
    dispatch: (action: RequestsActions) => void,
    initialRequest?: Request,
) : Promise<Request> {
    return core.requests
        .listen(requestID, {
            callback: (updatedRequest) => {
                updateRequestProgress(updatedRequest, dispatch);
            },
            initialRequest,
        });
}
