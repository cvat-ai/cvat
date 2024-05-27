// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers';
import {
    getCore, Storage, Job, Task, Project, InstanceType,
} from 'cvat-core-wrapper';
import { EventScope } from 'cvat-logger';
import { getProjectsAsync } from './projects-actions';
import { AnnotationActionTypes, fetchAnnotationsAsync } from './annotation-actions';
import {
    getInstanceType, listen, RequestInstanceType, RequestsActions,
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
    openImportDatasetModal: (instance: InstanceType) => (
        createAction(ImportActionTypes.OPEN_IMPORT_DATASET_MODAL, { instance })
    ),
    closeImportDatasetModal: (instance: InstanceType) => (
        createAction(ImportActionTypes.CLOSE_IMPORT_DATASET_MODAL, { instance })
    ),
    importDataset: (instance: InstanceType | RequestInstanceType, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: InstanceType | RequestInstanceType, resource: 'dataset' | 'annotation') => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance, resource })
    ),
    importDatasetFailed: (instance: InstanceType | RequestInstanceType, resource: 'dataset' | 'annotation', error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            resource,
            error,
        })
    ),
    importDatasetUpdateStatus: (instance: InstanceType, progress: number, status: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS, { instance, progress, status })
    ),
    openImportBackupModal: (instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.OPEN_IMPORT_BACKUP_MODAL, { instanceType })
    ),
    closeImportBackupModal: (instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.CLOSE_IMPORT_BACKUP_MODAL, { instanceType })
    ),
    importBackup: () => createAction(ImportActionTypes.IMPORT_BACKUP),
    importBackupSuccess: (instanceId: number, instanceType: 'project' | 'task') => (
        createAction(ImportActionTypes.IMPORT_BACKUP_SUCCESS, { instanceId, instanceType })
    ),
    importBackupFailed: (instanceType: 'project' | 'task', error: any) => (
        createAction(ImportActionTypes.IMPORT_BACKUP_FAILED, { instanceType, error })
    ),
};

export async function listenImportDatasetAsync(
    rqID: string,
    dispatch: (action: ImportActions | RequestsActions) => void,
    params: {
        instance: InstanceType | RequestInstanceType,
        format: string,
        showSuccessNotification?: boolean,
    },
): Promise<void> {
    const { instance, format, showSuccessNotification } = params;
    dispatch(importActions.importDataset(instance, format));

    const instanceType = getInstanceType(instance);
    const resource = instanceType === 'project' ? 'dataset' : 'annotation';
    try {
        await listen(rqID, dispatch);
        if (showSuccessNotification) dispatch(importActions.importDatasetSuccess(instance, resource));
    } catch (error) {
        dispatch(importActions.importDatasetFailed(instance, resource, error));
    }
}

export const importDatasetAsync = (
    instance: InstanceType,
    format: string,
    useDefaultSettings: boolean,
    sourceStorage: Storage,
    file: File | string,
    convMaskToPoly: boolean,
): ThunkAction => (
    async (dispatch, getState) => {
        const instanceType = getInstanceType(instance);
        const resource = instanceType === 'project' ? 'dataset' : 'annotation';

        try {
            const state: CombinedState = getState();

            if (instanceType === 'project') {
                if (state.import.projects.dataset.current?.[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                const rqID = await (instance as Project).annotations
                    .importDataset(format, useDefaultSettings, sourceStorage, file, {
                        convMaskToPoly,
                        uploadStatusCallback: (message: string, progress: number) => (
                            dispatch(importActions.importDatasetUpdateStatus(
                                instance, Math.floor(progress * 100), message,
                            ))
                        ),
                    });
                await listenImportDatasetAsync(rqID, dispatch, { instance, format });
            } else if (instanceType === 'task') {
                if (state.import.tasks.dataset.current?.[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                const rqID = await (instance as Task).annotations
                    .upload(format, useDefaultSettings, sourceStorage, file, {
                        convMaskToPoly,
                    });
                await listenImportDatasetAsync(rqID, dispatch, { instance, format });
            } else { // job
                if (state.import.tasks.dataset.current?.[(instance as Job).taskId]) {
                    throw Error('Annotations is being uploaded for the task');
                }
                if (state.import.jobs.dataset.current?.[instance.id]) {
                    throw Error('Only one uploading of annotations for a job allowed at the same time');
                }

                dispatch(importActions.importDataset(instance, format));

                const rqID = await (instance as Job).annotations
                    .upload(format, useDefaultSettings, sourceStorage, file, {
                        convMaskToPoly,
                    });
                await listenImportDatasetAsync(rqID, dispatch, { instance, format });

                await (instance as Job).logger.log(EventScope.uploadAnnotations);
                await (instance as Job).annotations.clear(true);
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

export const importBackupAsync = (instanceType: 'project' | 'task', storage: Storage, file: File | string): ThunkAction => (
    async (dispatch) => {
        dispatch(importActions.importBackup());
        try {
            const instanceClass = (instanceType === 'task') ? core.classes.Task : core.classes.Project;
            const rqID = await instanceClass.restore(storage, file);
            const result = await listen(rqID, dispatch);

            dispatch(importActions.importBackupSuccess(result?.resultID, instanceType));
        } catch (error) {
            dispatch(importActions.importBackupFailed(instanceType, error));
        }
    }
);

export type ImportActions = ActionUnion<typeof importActions>;
