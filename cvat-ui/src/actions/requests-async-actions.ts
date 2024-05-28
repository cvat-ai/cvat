// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ThunkAction } from 'utils/redux';
import { CombinedState, RequestsQuery, StorageLocation } from 'reducers';
import {
    getCore, RQStatus, Request, Project, Task, Job,
} from 'cvat-core-wrapper';
import { exportActions, listenExportBackupAsync, listenExportDatasetAsync } from './export-actions';
import { RequestInstanceType, requestsActions } from './requests-actions';
import { importActions, listenImportBackupAsync, listenImportDatasetAsync } from './import-actions';

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
                    if (target === 'task') {
                        instance = { id: taskID as number, type: target };
                    } else if (target === 'job') {
                        instance = { id: jobID as number, type: target };
                    } else if (target === 'project') {
                        instance = { id: projectID as number, type: target };
                    }

                    const instanceID = (instance as RequestInstanceType).id;
                    if (operationType === 'export') {
                        if (operationTarget === 'backup') {
                            if (
                                (target === 'task' && !(state.export.tasks.backup.current?.[instanceID])) ||
                                (target === 'project' && !(state.export.projects.backup.current?.[instanceID]))
                            ) {
                                dispatch(exportActions.exportBackup(instance as RequestInstanceType));
                                listenExportBackupAsync(rqID, dispatch, { instance: instance as RequestInstanceType });
                            }
                        } else if (operationTarget === 'dataset' || operationTarget === 'annotations') {
                            const field = operationTarget === 'dataset' ? 'dataset' : 'annotations';
                            if (
                                (target === 'task' && !(state.export.tasks[field].current?.[instanceID])) ||
                                (target === 'project' && !(state.export.projects[field].current?.[instanceID])) ||
                                (target === 'job' && !(state.export.jobs[field].current?.[instanceID]))
                            ) {
                                dispatch(exportActions.exportDataset(instance as RequestInstanceType, format, field));
                                listenExportDatasetAsync(
                                    rqID,
                                    dispatch,
                                    { instance: instance as RequestInstanceType, format, saveImages: type.includes('dataset') },
                                );
                            }
                        }
                    } else if (operationType === 'import') {
                        if (operationTarget === 'backup') {
                            dispatch(importActions.importBackup());
                            listenImportBackupAsync(rqID, dispatch, { instanceType: (instance as RequestInstanceType).type as 'project' | 'task' });
                        } else if (operationTarget === 'dataset' || operationTarget === 'annotations') {
                            if (
                                (target === 'task' && !(state.import.tasks.dataset.current?.[instanceID])) ||
                                (target === 'project' && !(state.import.projects.dataset.current?.[instanceID])) ||
                                (target === 'job' && !(state.import.jobs.dataset.current?.[instanceID]))
                            ) {
                                dispatch(importActions.importDataset(instance as RequestInstanceType, format));
                                listenImportDatasetAsync(
                                    rqID,
                                    dispatch,
                                    { instance: instance as RequestInstanceType },
                                );
                            }
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
