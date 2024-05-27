// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ThunkAction } from 'utils/redux';
import { CombinedState, RequestsQuery, StorageLocation } from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
} from 'cvat-core-wrapper';
import { listenExportBackupAsync, listenExportDatasetAsync } from './export-actions';
import { RequestInstanceType, listen, requestsActions } from './requests-actions';
import { listenImportDatasetAsync } from './import-actions';

const core = getCore();

export interface RequestParams {
    id: string;
    type: string;
    instance?: Project | Task | Job;
    location?: StorageLocation;
}

export function getRequestsAsync(query: RequestsQuery): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        dispatch(requestsActions.getRequests(query));

        const state: CombinedState = getState();

        try {
            const requests = await core.requests.list();
            dispatch(requestsActions.getRequestsSuccess(requests));

            requests
                .filter((request: Request) => [RQStatus.STARTED, RQStatus.QUEUED].includes(request.status))
                .forEach((request: Request): void => {
                    const {
                        id: rqID,
                        operation: {
                            type, target, format, taskID, projectID, jobID,
                        },
                    } = request;
                    let instance: RequestInstanceType | null = null;

                    const [operationType, operationTarget] = type.split(':');
                    const listeningPromise = listen(request.id, dispatch, request);
                    if (target === 'task') {
                        instance = { id: taskID as number, type: target, requestPromise: listeningPromise };
                    } else if (target === 'job') {
                        instance = { id: jobID as number, type: target, requestPromise: listeningPromise };
                    } else if (target === 'project') {
                        instance = { id: projectID as number, type: target, requestPromise: listeningPromise };
                    }

                    if (operationType === 'export') {
                        if (operationTarget === 'backup') {
                            if (!(state.export.tasks.backup.current?.[(instance as RequestInstanceType).id] ||
                                state.export.projects.backup.current?.[(instance as RequestInstanceType).id])
                            ) {
                                listenExportBackupAsync(rqID, dispatch, { instance: instance as RequestInstanceType });
                            }
                        } else if (!(state.export.tasks.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.export.projects.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.export.jobs.dataset.current?.[(instance as RequestInstanceType).id])
                        ) {
                            listenExportDatasetAsync(
                                rqID,
                                dispatch,
                                { instance: instance as RequestInstanceType, format, saveImages: type.includes('dataset') },
                            );
                        }
                    } else if (operationType === 'import') {
                        if (!(state.import.tasks.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.projects.dataset.current?.[(instance as RequestInstanceType).id] ||
                            state.import.jobs.dataset.current?.[(instance as RequestInstanceType).id])
                        ) {
                            listenImportDatasetAsync(
                                rqID,
                                dispatch,
                                { instance: instance as RequestInstanceType, format, showSuccessNotification: true },
                            );
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
