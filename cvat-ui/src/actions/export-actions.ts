// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    Storage, ProjectOrTaskOrJob, Job, getCore, StorageLocation,
} from 'cvat-core-wrapper';
import {
    getInstanceType, RequestInstanceType, listen,
    RequestsActions, updateRequestProgress,
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

const core = getCore();

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
        target?: StorageLocation,
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
    exportBackupSuccess: (instance: Exclude<ProjectOrTaskOrJob, Job> | RequestInstanceType, instanceType: 'task' | 'project', target?: StorageLocation) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_SUCCESS, { instance, instanceType, target })
    ),
    exportBackupFailed: (instance: Exclude<ProjectOrTaskOrJob, Job> | RequestInstanceType, instanceType: 'task' | 'project', error: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_FAILED, { instance, instanceType, error })
    ),
};

/** *
 * Function is supposed to be used when a new dataset export request initiated by a user
** */
export const exportDatasetAsync = (
    instance: ProjectOrTaskOrJob,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage: Storage,
    name?: string,
): ThunkAction => async (dispatch) => {
    const resource = saveImages ? 'dataset' : 'annotations';
    const instanceType = getInstanceType(instance);

    try {
        const rqID = await instance.annotations
            .exportDataset(format, saveImages, useDefaultSettings, targetStorage, name);

        if (rqID) {
            await core.requests.listen(rqID, {
                callback: (updatedRequest) => updateRequestProgress(updatedRequest, dispatch),
            });
            const target = targetStorage.location;
            dispatch(exportActions.exportDatasetSuccess(
                instance, instanceType, format, resource, target,
            ));
        } else {
            dispatch(exportActions.exportDatasetSuccess(
                instance, instanceType, format, resource,
            ));
        }
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, resource, error));
    }
};

/** *
 * Function is supposed to be used when a new backup export request initiated by a user
** */
export const exportBackupAsync = (
    instance: Exclude<ProjectOrTaskOrJob, Job>,
    targetStorage: Storage,
    useDefaultSetting: boolean,
    fileName: string,
): ThunkAction => async (dispatch) => {
    const instanceType = getInstanceType(instance) as 'project' | 'task';
    try {
        const rqID = await instance.backup(targetStorage, useDefaultSetting, fileName);
        if (rqID) {
            await core.requests.listen(rqID, {
                callback: (updatedRequest) => updateRequestProgress(updatedRequest, dispatch),
            });
            const target = targetStorage.location;
            dispatch(exportActions.exportBackupSuccess(instance, instanceType, target));
        } else {
            dispatch(exportActions.exportBackupSuccess(instance, instanceType));
        }
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
};

/** *
 * Function is supposed to be used when application starts listening to existing dataset export request
** */
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
        const target = !result?.url ? StorageLocation.CLOUD_STORAGE : StorageLocation.LOCAL;
        dispatch(exportActions.exportDatasetSuccess(
            instance, instanceType, format, resource, target,
        ));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, resource, error));
    }
}

/** *
 * Function is supposed to be used when application starts listening to existing backup export request
** */
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
        const target = !result?.url ? StorageLocation.CLOUD_STORAGE : StorageLocation.LOCAL;
        dispatch(exportActions.exportBackupSuccess(instance, instanceType, target));
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
}

export type ExportActions = ActionUnion<typeof exportActions>;
