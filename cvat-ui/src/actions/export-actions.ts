// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

import {
    Storage, Request, InstanceType, Job,
} from 'cvat-core-wrapper';
import {
    getInstanceType, isRequestInstanceType, RequestInstanceType, updateRequestProgress,
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
    openExportDatasetModal: (instance: any) => (
        createAction(ExportActionTypes.OPEN_EXPORT_DATASET_MODAL, { instance })
    ),
    closeExportDatasetModal: (instance: any) => (
        createAction(ExportActionTypes.CLOSE_EXPORT_DATASET_MODAL, { instance })
    ),
    exportDataset: (instance: InstanceType | RequestInstanceType, format: string) => (
        createAction(ExportActionTypes.EXPORT_DATASET, { instance, format })
    ),
    exportDatasetSuccess: (
        instance: InstanceType | RequestInstanceType,
        instanceType: 'project' | 'task' | 'job',
        format: string,
        isLocal: boolean,
        resource: 'Dataset' | 'Annotations',
    ) => (
        createAction(ExportActionTypes.EXPORT_DATASET_SUCCESS, {
            instance,
            instanceType,
            format,
            isLocal,
            resource,
        })
    ),
    exportDatasetFailed: (instance: InstanceType | RequestInstanceType, instanceType: 'project' | 'task' | 'job', format: string, error: any) => (
        createAction(ExportActionTypes.EXPORT_DATASET_FAILED, {
            instance,
            instanceType,
            format,
            error,
        })
    ),
    openExportBackupModal: (instance: any) => (
        createAction(ExportActionTypes.OPEN_EXPORT_BACKUP_MODAL, { instance })
    ),
    closeExportBackupModal: (instance: any) => (
        createAction(ExportActionTypes.CLOSE_EXPORT_BACKUP_MODAL, { instance })
    ),
    exportBackup: (instance: Exclude<InstanceType, Job> | RequestInstanceType) => (
        createAction(ExportActionTypes.EXPORT_BACKUP, { instance })
    ),
    exportBackupSuccess: (instance: Exclude<InstanceType, Job> | RequestInstanceType, instanceType: 'task' | 'project', isLocal: boolean) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_SUCCESS, { instance, instanceType, isLocal })
    ),
    exportBackupFailed: (instance: Exclude<InstanceType, Job> | RequestInstanceType, instanceType: 'task' | 'project', error: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_FAILED, { instance, instanceType, error })
    ),
};

export const exportDatasetAsync = (
    instance: InstanceType | RequestInstanceType,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage?: Storage,
    name?: string,
    listeningPromise?: Promise<Request>,
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportDataset(instance, format));

    const instanceType = getInstanceType(instance);

    try {
        let result;
        if (isRequestInstanceType(instance)) {
            result = await listeningPromise;
        } else {
            result = await instance.annotations
                .exportDataset(format, saveImages, useDefaultSettings, targetStorage, name, {
                    requestStatusCallback: (request: Request) => {
                        updateRequestProgress(request, dispatch);
                    },
                });
        }

        const resource = saveImages ? 'Dataset' : 'Annotations';
        dispatch(exportActions.exportDatasetSuccess(instance, instanceType, format, !!result.url, resource));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, error));
    }
};

export const exportBackupAsync = (
    instance: Exclude<InstanceType, Job> | RequestInstanceType,
    targetStorage?: Storage,
    useDefaultSetting?: boolean,
    fileName?: string,
    listeningPromise?: Promise<Request>,
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportBackup(instance));
    const instanceType = getInstanceType(instance);

    try {
        let result;
        if (isRequestInstanceType(instance)) {
            result = await listeningPromise;
        } else {
            result = await instance
                .backup(targetStorage, useDefaultSetting, fileName, {
                    requestStatusCallback: (request: Request) => {
                        updateRequestProgress(request, dispatch);
                    },
                });
        }
        dispatch(exportActions.exportBackupSuccess(instance, instanceType, !!result.url));
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
};

export type ExportActions = ActionUnion<typeof exportActions>;
