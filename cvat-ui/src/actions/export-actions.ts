// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

import { Storage, ProjectOrTaskOrJob, Job } from 'cvat-core-wrapper';
import {
    getInstanceType, RequestInstanceType, listen, RequestsActions,
    shouldListenForProgress,
} from './requests-actions';

export enum ExportActionTypes {
    OPEN_EXPORT_DATASET_MODAL = 'OPEN_EXPORT_DATASET_MODAL',
    CLOSE_EXPORT_DATASET_MODAL = 'CLOSE_EXPORT_DATASET_MODAL',
    EXPORT_DATASET = 'EXPORT_DATASET',
    EXPORT_DATASET_SUCCESS = 'EXPORT_DATASET_SUCCESS',
    EXPORT_DATASET_FAILED = 'EXPORT_DATASET_FAILED',
    OPEN_EXPORT_BACKUP_MODAL = 'OPEN_EXPORT_BACKUP_MODAL',
    CLOSE_EXPORT_BACKUP_MODAL = 'CLOSE_EXPORT_BACKUP_MODAL',
    EXPORT_BACKUP = 'EXPORT_BACKUP',
    EXPORT_BACKUP_SUCCESS = 'EXPORT_BACKUP_SUCCESS',
    EXPORT_BACKUP_FAILED = 'EXPORT_BACKUP_FAILED',
}

export const exportActions = {
    openExportDatasetModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ExportActionTypes.OPEN_EXPORT_DATASET_MODAL, { instance })
    ),
    closeExportDatasetModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ExportActionTypes.CLOSE_EXPORT_DATASET_MODAL, { instance })
    ),
    exportDatasetSuccess: (
        instance: ProjectOrTaskOrJob | RequestInstanceType,
        instanceType: 'project' | 'task' | 'job',
        format: string,
        resource: 'dataset' | 'annotations',
        target?: 'local' | 'cloudstorage',
    ) => (
        createAction(ExportActionTypes.EXPORT_DATASET_SUCCESS, {
            instance,
            instanceType,
            format,
            target,
            resource,
        })
    ),
    exportDatasetFailed: (
        instance: ProjectOrTaskOrJob | RequestInstanceType,
        instanceType: 'project' | 'task' | 'job',
        format: string,
        resource: 'dataset' | 'annotations',
        error: any,
    ) => (
        createAction(ExportActionTypes.EXPORT_DATASET_FAILED, {
            instance,
            instanceType,
            format,
            resource,
            error,
        })
    ),
    openExportBackupModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ExportActionTypes.OPEN_EXPORT_BACKUP_MODAL, { instance })
    ),
    closeExportBackupModal: (instance: ProjectOrTaskOrJob) => (
        createAction(ExportActionTypes.CLOSE_EXPORT_BACKUP_MODAL, { instance })
    ),
    exportBackupSuccess: (instance: Exclude<ProjectOrTaskOrJob, Job> | RequestInstanceType, instanceType: 'task' | 'project', target?: 'local' | 'cloudstorage') => (
        createAction(ExportActionTypes.EXPORT_BACKUP_SUCCESS, { instance, instanceType, target })
    ),
    exportBackupFailed: (instance: Exclude<ProjectOrTaskOrJob, Job> | RequestInstanceType, instanceType: 'task' | 'project', error: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_FAILED, { instance, instanceType, error })
    ),
};

export async function listenExportDatasetAsync(
    rqID: string,
    dispatch: (action: ExportActions | RequestsActions) => void,
    params: {
        instance: ProjectOrTaskOrJob | RequestInstanceType,
        format: string,
        saveImages: boolean,
    },
): Promise<void> {
    const { instance, format, saveImages } = params;
    const resource = saveImages ? 'dataset' : 'annotations';

    const instanceType = getInstanceType(instance);
    try {
        const result = await listen(rqID, dispatch);
        const target = !result?.url ? 'cloudstorage' : 'local';
        dispatch(exportActions.exportDatasetSuccess(
            instance, instanceType, format, resource, target,
        ));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, resource, error));
    }
}

export const exportDatasetAsync = (
    instance: ProjectOrTaskOrJob,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage: Storage,
    name?: string,
): ThunkAction => async (dispatch, getState) => {
    const state = getState();

    const resource = saveImages ? 'dataset' : 'annotations';
    const instanceType = getInstanceType(instance);

    try {
        const rqID = await instance.annotations
            .exportDataset(format, saveImages, useDefaultSettings, targetStorage, name);
        if (shouldListenForProgress(rqID, state.requests)) {
            await listenExportDatasetAsync(rqID, dispatch, {
                instance, format, saveImages,
            });
        }
        if (!rqID) {
            dispatch(exportActions.exportDatasetSuccess(
                instance, instanceType, format, resource,
            ));
        }
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, resource, error));
    }
};

export async function listenExportBackupAsync(
    rqID: string,
    dispatch: (action: ExportActions | RequestsActions) => void,
    params: {
        instance: Exclude<ProjectOrTaskOrJob, Job> | RequestInstanceType,
    },
): Promise<void> {
    const { instance } = params;
    const instanceType = getInstanceType(instance) as 'project' | 'task';

    try {
        const result = await listen(rqID, dispatch);
        const target = !result?.url ? 'cloudstorage' : 'local';
        dispatch(exportActions.exportBackupSuccess(instance, instanceType, target));
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
}

export const exportBackupAsync = (
    instance: Exclude<ProjectOrTaskOrJob, Job>,
    targetStorage: Storage,
    useDefaultSetting: boolean,
    fileName: string,
): ThunkAction => async (dispatch, getState) => {
    const state = getState();

    const instanceType = getInstanceType(instance) as 'project' | 'task';

    try {
        const rqID = await instance
            .backup(targetStorage, useDefaultSetting, fileName);
        if (shouldListenForProgress(rqID, state.requests)) {
            await listenExportBackupAsync(rqID, dispatch, { instance });
        }
        if (!rqID) {
            dispatch(exportActions.exportBackupSuccess(instance, instanceType));
        }
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
};

export type ExportActions = ActionUnion<typeof exportActions>;
