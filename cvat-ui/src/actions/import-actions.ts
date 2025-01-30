// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import {
    getCore, Storage, Job, Task, Project, ProjectOrTaskOrJob,
} from 'cvat-core-wrapper';
import { getProjectsAsync } from './projects-actions';
import { AnnotationActionTypes, fetchAnnotationsAsync } from './annotation-actions';
import {
    getInstanceType, listen, RequestInstanceType,
    RequestsActions, updateRequestProgress,
} from './requests-actions';

const core = getCore();

export enum ImportActionTypes {
    OPEN_IMPORT_DATASET_MODAL = 'OPEN_IMPORT_DATASET_MODAL',
    CLOSE_IMPORT_DATASET_MODAL = 'CLOSE_IMPORT_DATASET_MODAL',
    IMPORT_DATASET = 'IMPORT_DATASET',
    IMPORT_DATASET_SUCCESS = 'IMPORT_DATASET_SUCCESS',
    IMPORT_DATASET_FAILED = 'IMPORT_DATASET_FAILED',
    IMPORT_DATASET_UPDATE_STATUS = 'IMPORT_DATASET_UPDATE_STATUS',
    OPEN_IMPORT_BACKUP_MODAL = 'OPEN_IMPORT_BACKUP_MODAL',
    CLOSE_IMPORT_BACKUP_MODAL = 'CLOSE_IMPORT_BACKUP_MODAL',
    IMPORT_BACKUP = 'IMPORT_BACKUP',
    IMPORT_BACKUP_SUCCESS = 'IMPORT_BACKUP_SUCCESS',
    IMPORT_BACKUP_FAILED = 'IMPORT_BACKUP_FAILED',
}

export const importActions = {
    openImportDatasetModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ImportActionTypes.OPEN_IMPORT_DATASET_MODAL, { instance })
    ),
    closeImportDatasetModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ImportActionTypes.CLOSE_IMPORT_DATASET_MODAL, { instance })
    ),
    importDataset: (instance: ProjectOrTaskOrJob | RequestInstanceType, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: ProjectOrTaskOrJob | RequestInstanceType, resource: 'dataset' | 'annotation') => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance, resource })
    ),
    importDatasetFailed: (instance: ProjectOrTaskOrJob | RequestInstanceType, resource: 'dataset' | 'annotation', error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            resource,
            error,
        })
    ),
    importDatasetUpdateStatus: (instance: ProjectOrTaskOrJob, progress: number, status: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS, { instance, progress, status })
    ),
    openImportBackupModal: (instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.OPEN_IMPORT_BACKUP_MODAL, { instanceType })
    ),
    importBackup: () => createAction(ImportActionTypes.IMPORT_BACKUP),
    closeImportBackupModal: (instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.CLOSE_IMPORT_BACKUP_MODAL, { instanceType })
    ),
    importBackupSuccess: (instanceId: number, instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.IMPORT_BACKUP_SUCCESS, { instanceId, instanceType })
    ),
    importBackupFailed: (instanceType: 'project' | 'task', error: any) => (
        createAction(ImportActionTypes.IMPORT_BACKUP_FAILED, { instanceType, error })
    ),
};

/** *
 * Function is supposed to be used when a new dataset import request initiated by a user
** */
export const importDatasetAsync = (
    instance: ProjectOrTaskOrJob,
    format: string,
    useDefaultSettings: boolean,
    sourceStorage: Storage,
    file: File | string,
    convMaskToPoly: boolean,
): ThunkAction => (
    async (dispatch, getState) => {
        const instanceType = getInstanceType(instance);
        const resource = instanceType === 'project' ? 'dataset' : 'annotation';

        const listenForImport = (rqID: string) => core.requests.listen(rqID, {
            callback: (updatedRequest) => updateRequestProgress(updatedRequest, dispatch),
        });

        try {
            if (instanceType === 'project') {
                dispatch(importActions.importDataset(instance, format));
                const rqID = await (instance as Project).annotations.importDataset(
                    format,
                    useDefaultSettings,
                    sourceStorage,
                    file,
                    {
                        convMaskToPoly,
                        updateStatusCallback: (message: string, progress: number) => (
                            dispatch(importActions.importDatasetUpdateStatus(
                                instance, Math.floor(progress * 100), message,
                            ))
                        ),
                    },
                );

                await listenForImport(rqID);
            } else if (instanceType === 'task') {
                dispatch(importActions.importDataset(instance, format));
                const rqID = await (instance as Task).annotations.upload(
                    format,
                    useDefaultSettings,
                    sourceStorage,
                    file,
                    { convMaskToPoly },
                );
                await listenForImport(rqID);
            } else { // job
                dispatch(importActions.importDataset(instance, format));
                const rqID = await (instance as Job).annotations.upload(
                    format,
                    useDefaultSettings,
                    sourceStorage,
                    file,
                    { convMaskToPoly },
                );

                await listenForImport(rqID);
                await (instance as Job).annotations.clear({ reload: true });
                await (instance as Job).actions.clear();

                // first set empty objects list
                // to escape some problems in canvas when shape with the same
                // clientID has different type (polygon, rectangle) for example
                dispatch({ type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS });

                const relevantInstance = getState().annotation.job.instance;
                if (relevantInstance && relevantInstance.id === instance.id) {
                    setTimeout(() => {
                        dispatch(fetchAnnotationsAsync());
                    });
                }
            }
        } catch (error) {
            dispatch(importActions.importDatasetFailed(instance, resource, error));
            return;
        }

        dispatch(importActions.importDatasetSuccess(instance, resource));
        if (instance instanceof core.classes.Project) {
            dispatch(getProjectsAsync({ id: instance.id }, getState().projects.tasksGettingQuery));
        }
    }
);

/** *
 * Function is supposed to be used when a new backup import request initiated by a user
** */
export const importBackupAsync = (instanceType: 'project' | 'task', storage: Storage, file: File | string): ThunkAction => (
    async (dispatch) => {
        dispatch(importActions.importBackup());
        try {
            const instanceClass = (instanceType === 'task') ? core.classes.Task : core.classes.Project;
            const rqID = await instanceClass.restore(storage, file);
            const result = await core.requests.listen(rqID, {
                callback: (updatedRequest) => updateRequestProgress(updatedRequest, dispatch),
            });
            dispatch(importActions.importBackupSuccess(result?.resultID as number, instanceType));
        } catch (error) {
            dispatch(importActions.importBackupFailed(instanceType, error));
        }
    }
);

/** *
 * Function is supposed to be used when application starts listening to existing backup import request
** */
export async function listenImportBackupAsync(
    rqID: string,
    dispatch: (action: ImportActions | RequestsActions) => void,
    params: {
        instanceType: 'project' | 'task',
    },
): Promise<void> {
    const { instanceType } = params;
    try {
        const result = await listen(rqID, dispatch);
        dispatch(importActions.importBackupSuccess(result?.resultID as number, instanceType));
    } catch (error) {
        dispatch(importActions.importBackupFailed(instanceType, error));
    }
}

/** *
 * Function is supposed to be used when application starts listening to existing dataset import request
** */
export async function listenImportDatasetAsync(
    rqID: string,
    dispatch: (action: ImportActions | RequestsActions) => void,
    params: {
        instance: ProjectOrTaskOrJob | RequestInstanceType,
    },
): Promise<void> {
    const { instance } = params;

    const instanceType = getInstanceType(instance);
    const resource = instanceType === 'project' ? 'dataset' : 'annotation';
    try {
        await listen(rqID, dispatch);
        dispatch(importActions.importDatasetSuccess(instance, resource));
    } catch (error) {
        dispatch(importActions.importDatasetFailed(instance, resource, error));
    }
}

export type ImportActions = ActionUnion<typeof importActions>;
