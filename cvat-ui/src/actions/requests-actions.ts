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
}

export const requestsActions = {
    getRequests: (query?: RequestsQuery) => createAction(RequestsActionsTypes.GET_REQUESTS, { query }),
    requestFinished: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FINISHED, { request }),
    requestFailed: (request: Request) => createAction(RequestsActionsTypes.REQUEST_FAILED, { request }),
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

export function updateRequestProgress(request: Request, dispatch: (action: RequestsActions) => void): void {
    dispatch(
        requestsActions.getRequestStatusSuccess(request),
    );
}

export function listen(request: Request, dispatch: (action: RequestsActions) => void): Promise<void | Request> {
    const { id } = request;
    return core.requests
        .listen(id, (updatedRequest) => {
            updateRequestProgress(updatedRequest, dispatch);
        })
        .catch((error: Error) => {
            request.updateFields({ status: RQStatus.UNKNOWN, percent: 0, message: '' });
            dispatch(
                requestsActions.getRequestStatusFailed(request, error),
            );
        });
}

export function getRequestsAsync(query: RequestsQuery, notify = true): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(requestsActions.getRequests(query));

        try {
            const { requests, count } = await core.requests.list();
            dispatch(requestsActions.getRequestsSuccess(requests, count));

            if (notify) {
                const shownNotifications = JSON.parse(localStorage.getItem('requestsNotifications') || '[]');

                requests
                    .forEach((request: Request): void => {
                        if (!shownNotifications.includes(request.id)) {
                            if (request.status === RQStatus.FAILED) {
                                dispatch(requestsActions.requestFailed(request));
                            }
                            if (request.status === RQStatus.FINISHED) {
                                dispatch(requestsActions.requestFinished(request));
                            }

                            if ([RQStatus.FAILED, RQStatus.FINISHED].includes(request.status)) {
                                shownNotifications.push(request.id);
                            }
                        }
                    });

                localStorage.setItem('requestsNotifications', JSON.stringify(shownNotifications));
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
