// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers';
import {
    getCore, Storage, Job, Task, Project,
} from 'cvat-core-wrapper';
import { EventScope } from 'cvat-logger';
import { getProjectsAsync } from './projects-actions';
import { AnnotationActionTypes, fetchAnnotationsAsync } from './annotation-actions';

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
    openImportDatasetModal: (instance: any) => (
        createAction(ImportActionTypes.OPEN_IMPORT_DATASET_MODAL, { instance })
    ),
    closeImportDatasetModal: (instance: any) => (
        createAction(ImportActionTypes.CLOSE_IMPORT_DATASET_MODAL, { instance })
    ),
    importDataset: (instance: any, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: Job | Task | Project, resource: 'dataset' | 'annotation') => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance, resource })
    ),
    importDatasetFailed: (instance: Job | Task | Project, resource: 'dataset' | 'annotation', error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            resource,
            error,
        })
    ),
    importDatasetUpdateStatus: (instance: any, progress: number, status: string) => (
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

export const importDatasetAsync = (
    instance: any,
    format: string,
    useDefaultSettings: boolean,
    sourceStorage: Storage,
    file: File | string,
    convMaskToPoly: boolean,
): ThunkAction => (
    async (dispatch, getState) => {
        const resource = instance instanceof core.classes.Project ? 'dataset' : 'annotation';

        try {
            const state: CombinedState = getState();

            if (instance instanceof core.classes.Project) {
                if (state.import.projects.dataset.current?.[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                await instance.annotations
                    .importDataset(format, useDefaultSettings, sourceStorage, file, {
                        convMaskToPoly,
                        updateStatusCallback: (message: string, progress: number) => (
                            dispatch(importActions.importDatasetUpdateStatus(
                                instance, Math.floor(progress * 100), message,
                            ))
                        ),
                    });
            } else if (instance instanceof core.classes.Task) {
                if (state.import.tasks.dataset.current?.[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                await instance.annotations.upload(format, useDefaultSettings, sourceStorage, file, { convMaskToPoly });
            } else { // job
                if (state.import.tasks.dataset.current?.[instance.taskId]) {
                    throw Error('Annotations is being uploaded for the task');
                }
                if (state.import.jobs.dataset.current?.[instance.id]) {
                    throw Error('Only one uploading of annotations for a job allowed at the same time');
                }

                dispatch(importActions.importDataset(instance, format));

                await instance.annotations.upload(format, useDefaultSettings, sourceStorage, file, { convMaskToPoly });
                await instance.logger.log(EventScope.uploadAnnotations);
                await instance.annotations.clear(true);
                await instance.actions.clear();

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
            const instance = await instanceClass.restore(storage, file);
            dispatch(importActions.importBackupSuccess(instance.id, instanceType));
        } catch (error) {
            dispatch(importActions.importBackupFailed(instanceType, error));
        }
    }
);

export type ImportActions = ActionUnion<typeof importActions>;
