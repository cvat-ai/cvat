// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ThunkAction } from 'utils/redux';
import {
    CombinedState,
    RequestsQuery, StorageLocation,
} from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
    RequestsFilter,
} from 'cvat-core-wrapper';
import { exportBackupAsync, exportDatasetAsync } from './export-actions';
import {
    RequestInstanceType, requestsActions, RequestsActions, updateRequestProgress,
} from './requests-actions';
import { importDatasetAsync } from './import-actions';

const core = getCore();

export interface RequestParams {
    id: string;
    type: string;
    instance?: Project | Task | Job;
    location?: StorageLocation;
}

export function listen(request: Request, dispatch: (action: RequestsActions) => void): Promise<Request> {
    const { id, operation: { type, taskID } } = request;
    let filter: RequestsFilter | undefined;
    if (type === 'create:task') {
        filter = { taskID: taskID as number, action: 'create' };
    }

    return core.requests
        .listen(filter ? null : id, {
            callback: (updatedRequest) => {
                updateRequestProgress(updatedRequest, dispatch);
            },
            filter,
            initialRequest: request,
        })
        .catch((error: Error) => {
            request.updateFields({ status: RQStatus.UNKNOWN, progress: 0, message: '' });
            dispatch(
                requestsActions.getRequestStatusFailed(request, error),
            );
            return request;
        });
}

export function getRequestsAsync(query: RequestsQuery, notify = true): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        dispatch(requestsActions.getRequests(query));

        const state: CombinedState = getState();

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
                    const {
                        operation: {
                            type, target, format, taskID, projectID, jobID,
                        },
                    } = request;
                    let instance: RequestInstanceType | null = null;

                    const [operationType, operationTarget] = type.split(':');
                    const listeningPromise = listen(request, dispatch);
                    if (target === 'task') {
                        instance = { id: taskID as number, type: target, requestPromise: listeningPromise };
                    } else if (target === 'job') {
                        instance = { id: jobID as number, type: target, requestPromise: listeningPromise };
                    } else if (target === 'project') {
                        instance = { id: projectID as number, type: target, requestPromise: listeningPromise };
                    }

                    if (operationType === 'export') {
                        if (operationTarget === 'backup') {
                            if (!(state.import.tasks.backup.importing ||
                                state.import.projects.backup.importing)
                            ) {
                                dispatch(exportBackupAsync(
                                    instance as RequestInstanceType,
                                    undefined,
                                    undefined,
                                    undefined,
                                ));
                            }
                        } else if (!(state.import.tasks.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.projects.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.jobs.dataset.current?.[(instance as RequestInstanceType).id])
                        ) {
                            dispatch(exportDatasetAsync(
                                instance as RequestInstanceType,
                                format,
                                operationTarget === 'dataset',
                                true,
                                undefined,
                                undefined,
                                listeningPromise,
                            ));
                        }
                    } else if (operationType === 'import') {
                        if (!(state.import.tasks.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.projects.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.jobs.dataset.current?.[(instance as RequestInstanceType).id])
                        ) {
                            dispatch(importDatasetAsync(
                                instance as RequestInstanceType,
                                format,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                listeningPromise,
                            ));
                        }
                    }
                });
        } catch (error) {
            dispatch(requestsActions.getRequestsFailed(error));
        }
    };
}

export function cancelRequestAsync(request: Request, onSuccess: () => void): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(requestsActions.cancelRequest(request));

        try {
            await core.requests.cancel(request.id);
            onSuccess();
        } catch (error) {
            dispatch(requestsActions.cancelRequestFailed(request, error));
        }
    };
}
