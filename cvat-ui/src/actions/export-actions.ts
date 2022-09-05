// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

import { getCore, Storage } from 'cvat-core-wrapper';

const core = getCore();

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
    exportDataset: (instance: any, format: string) => (
        createAction(ExportActionTypes.EXPORT_DATASET, { instance, format })
    ),
    exportDatasetSuccess: (
        instance: any,
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
    exportDatasetFailed: (instance: any, instanceType: 'project' | 'task' | 'job', format: string, error: any) => (
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
    exportBackup: (instance: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP, { instance })
    ),
    exportBackupSuccess: (instance: any, instanceType: 'task' | 'project', isLocal: boolean) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_SUCCESS, { instance, instanceType, isLocal })
    ),
    exportBackupFailed: (instance: any, instanceType: 'task' | 'project', error: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_FAILED, { instance, instanceType, error })
    ),
};

export const exportDatasetAsync = (
    instance: any,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage: Storage,
    name?: string,
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportDataset(instance, format));

    let instanceType: 'project' | 'task' | 'job';
    if (instance instanceof core.classes.Project) {
        instanceType = 'project';
    } else if (instance instanceof core.classes.Task) {
        instanceType = 'task';
    } else {
        instanceType = 'job';
    }

    try {
        const result = await instance.annotations
            .exportDataset(format, saveImages, useDefaultSettings, targetStorage, name);
        if (result) {
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = result;
            downloadAnchor.click();
        }
        const resource = saveImages ? 'Dataset' : 'Annotations';
        dispatch(exportActions.exportDatasetSuccess(instance, instanceType, format, !!result, resource));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, instanceType, format, error));
    }
};

export const exportBackupAsync = (
    instance: any,
    targetStorage: Storage,
    useDefaultSetting: boolean,
    fileName?: string,
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportBackup(instance));
    const instanceType = (instance instanceof core.classes.Project) ? 'project' : 'task';

    try {
        const result = await instance.backup(targetStorage, useDefaultSetting, fileName);
        if (result) {
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = result;
            downloadAnchor.click();
        }
        dispatch(exportActions.exportBackupSuccess(instance, instanceType, !!result));
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance, instanceType, error as Error));
    }
};

export type ExportActions = ActionUnion<typeof exportActions>;
