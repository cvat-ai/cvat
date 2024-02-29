// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    RequestsQuery, StorageLocation,
} from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
} from 'cvat-core-wrapper';

export enum RequestsActionsTypes {
    GET_REQUESTS = 'GET_REQUESTS',
    GET_REQUESTS_SUCCESS = 'GET_REQUESTS_SUCCESS',
    GET_REQUESTS_FAILED = 'GET_REQUESTS_FAILED',
    GET_REQUESTS_STATUS_SUCCESS = 'GET_REQUESTS_STATUS_SUCCESS',
    GET_REQUESTS_STATUS_FAILED = 'GET_REQUESTS_STATUS_FAILED',
    REQUEST_FINISHED = 'REQUEST_FINISHED',
    REQUEST_FAILED = 'REQUEST_FAILED',
    REQUEST_UPDATED = 'REQUEST_UPDATED',
}

export const requestsActions = {
    getRequests: (query?: RequestsQuery) => createAction(RequestsActionsTypes.GET_REQUESTS, { query }),
    requestFinished: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FINISHED, { request }),
    requestFailed: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FAILED, { request }),
    requestUpdated: (request: Request) => createAction(RequestsActionsTypes.REQUEST_UPDATED, { request }),
    getRequestsSuccess: (requests: Request[], count: number) => createAction(
        RequestsActionsTypes.GET_REQUESTS_SUCCESS, { requests, count },
    ),
    getRequestsFailed: (error: any) => createAction(RequestsActionsTypes.GET_REQUESTS_FAILED, {
        error,
    }),
    getRequestStatusSuccess: (request: Request) => (
        createAction(RequestsActionsTypes.GET_REQUESTS_STATUS_SUCCESS, {
            request,
        })
    ),
    getRequestStatusFailed: (request: Request, error: any) => (
        createAction(RequestsActionsTypes.GET_REQUESTS_STATUS_FAILED, {
            request,
            error,
        })
    ),
};

export type RequestsActions = ActionUnion<typeof requestsActions>;

const core = getCore();
export interface RequestParams {
    id: string;
    type: string;
    instance?: Project | Task | Job;
    location?: StorageLocation;
}

export function listen(request: Request, dispatch: (action: RequestsActions) => void): Promise<void> {
    const { id } = request;
    return core.requests
        .listen(id, (updatedRequest) => {
            request.updateFields(updatedRequest);
            const { status, message } = updatedRequest;
            if (status === RQStatus.FAILED || status === RQStatus.UNKNOWN) {
                dispatch(
                    requestsActions.getRequestStatusFailed(
                        request,
                        new Error(`Request status for the job ${id} is ${status}. ${message}`),
                    ),
                );

                return;
            }

            dispatch(
                requestsActions.getRequestStatusSuccess(request),
            );
            if (status === RQStatus.FINISHED) {
                // status success
                dispatch(
                    requestsActions.requestFinished(request),
                );
            }
        })
        .catch((error: Error) => {
            request.updateFields({ status: RQStatus.UNKNOWN, progress: 0, message: '' });
            dispatch(
                requestsActions.getRequestStatusFailed(request, error),
            );
        });
}

export function listenNewRequest(params: RequestParams, dispatch: (action: RequestsActions) => void): Promise<any> {
    const {
        instance, id, type, location,
    } = params;
    let target = 'job';
    if (instance instanceof Project) {
        target = 'project';
    } else if (instance instanceof Task) {
        target = 'task';
    }
    const request = new Request({
        id,
        status: RQStatus.QUEUED,
        operation: {
            target,
            type,
            name: params.instance?.name ? params.instance?.name : '',
            format: 'unknown',
            job_id: instance instanceof Job ? instance.id : null,
            task_id: instance instanceof Task ? instance.id : null,
            project_id: instance instanceof Project ? instance.id : null,
        },
        progress: 0,
        message: '',
        result_url: '',
        enqueue_date: new Date().toString(),
        start_date: '',
        finish_date: '',
        expire_date: '',
        owner: null,
        meta: location ? { storage: { location } } : undefined,
    });

    return listen(request, dispatch);
}

export function getRequestsAsync(query: RequestsQuery, notify = true): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(requestsActions.getRequests(query));

        try {
            const result = await core.requests.list();
            const { requests, count } = result;

            dispatch(requestsActions.getRequestsSuccess(requests, count));

            if (notify) {
                requests
                    .filter((request: Request) => [RQStatus.FINISHED].includes(request.status))
                    .forEach((request: Request): void => {
                        dispatch(requestsActions.requestFinished(request));
                    });
                requests
                    .filter((request: Request) => [RQStatus.FAILED].includes(request.status))
                    .forEach((request: Request): void => {
                        dispatch(requestsActions.requestFailed(request));
                    });
            }

            requests
                .filter((request: Request) => [RQStatus.STARTED, RQStatus.QUEUED].includes(request.status))
                .forEach((request: Request): void => {
                    listen(request, dispatch);
                });
        } catch (error) {
            dispatch(requestsActions.getRequestsFailed(error));
        }
    };
}
