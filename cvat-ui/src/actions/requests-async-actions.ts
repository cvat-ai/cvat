// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ThunkAction } from 'utils/redux';
import {
    RequestsQuery, StorageLocation,
} from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
} from 'cvat-core-wrapper';
import { exportBackupAsync, exportDatasetAsync } from './export-actions';
import { requestsActions, RequestsActions, updateRequestProgress } from './requests-actions';
import { importDatasetAsync } from './import-actions';

const core = getCore();

export interface RequestParams {
    id: string;
    type: string;
    instance?: Project | Task | Job;
    location?: StorageLocation;
}

export function listen(request: Request, dispatch: (action: RequestsActions) => void): Promise<Request> {
    const { id } = request;
    return core.requests
        .listen(id, {
            callback: (updatedRequest) => {
                updateRequestProgress(updatedRequest, dispatch);
            },
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
                    const {
                        operation: {
                            type, target, format, taskID, projectID, jobID,
                        },
                    } = request;
                    let instance = null;
                    if (target === 'task') {
                        instance = new Task({ id: taskID as number });
                    } else if (target === 'job') {
                        instance = new Job({ id: jobID as number });
                    } else if (target === 'project') {
                        instance = new Project({ id: projectID as number });
                    }

                    const [operationType, operationTarget] = type.split(':');
                    const listeningPromise = listen(request, dispatch);

                    if (operationType === 'export') {
                        if (operationTarget === 'backup') {
                            dispatch(exportBackupAsync(
                                instance,
                                undefined,
                                undefined,
                                undefined,
                            ));
                        } else {
                            dispatch(exportDatasetAsync(
                                instance,
                                format,
                                operationTarget === 'dataset',
                                true,
                                undefined,
                                undefined,
                                listeningPromise,
                            ));
                        }
                    } else if (operationType === 'import') {
                        dispatch(importDatasetAsync(
                            instance,
                            format,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            listeningPromise,
                        ));
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
