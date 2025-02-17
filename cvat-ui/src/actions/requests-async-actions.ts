// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ThunkAction } from 'utils/redux';
import { CombinedState, RequestsQuery, StorageLocation } from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
} from 'cvat-core-wrapper';
import { listenExportBackupAsync, listenExportDatasetAsync } from './export-actions';
import {
    RequestInstanceType, listen, requestsActions,
} from './requests-actions';
import { listenImportBackupAsync, listenImportDatasetAsync } from './import-actions';

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
                        status,
                        operation: {
                            type, target, format, taskID, projectID, jobID,
                        },
                    } = request;

                    const isRequestFinished = [RQStatus.FINISHED, RQStatus.FAILED].includes(status);
                    if (state.requests.requests[rqID] || isRequestFinished) {
                        return;
                    }

                    let instance: RequestInstanceType | null = null;

                    const [operationType, operationTarget] = type.split(':');
                    if (target === 'task') {
                        instance = { id: taskID as number, type: target };
                    } else if (target === 'job') {
                        instance = { id: jobID as number, type: target };
                    } else if (target === 'project') {
                        instance = { id: projectID as number, type: target };
                    }

                    if (operationType === 'export') {
                        if (operationTarget === 'backup') {
                            listenExportBackupAsync(rqID, dispatch, { instance: instance as RequestInstanceType });
                        } else if (operationTarget === 'dataset' || operationTarget === 'annotations') {
                            listenExportDatasetAsync(
                                rqID,
                                dispatch,
                                { instance: instance as RequestInstanceType, format, saveImages: type.includes('dataset') },
                            );
                        }
                    } else if (operationType === 'import') {
                        if (operationTarget === 'backup') {
                            listenImportBackupAsync(rqID, dispatch, { instanceType: (instance as RequestInstanceType).type as 'project' | 'task' });
                        } else if (operationTarget === 'dataset' || operationTarget === 'annotations') {
                            listenImportDatasetAsync(
                                rqID,
                                dispatch,
                                { instance: instance as RequestInstanceType },
                            );
                        }
                    } else if (operationType === 'create') {
                        if (operationTarget === 'task') {
                            listen(rqID, dispatch);
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
