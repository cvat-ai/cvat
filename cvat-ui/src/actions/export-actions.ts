// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

import { getCore, Storage } from 'cvat-core-wrapper';

const core = getCore();

export enum ExportActionTypes {
    OPEN_EXPORT_MODAL = 'OPEN_EXPORT_MODAL',
    CLOSE_EXPORT_MODAL = 'CLOSE_EXPORT_MODAL',
    EXPORT_DATASET = 'EXPORT_DATASET',
    EXPORT_DATASET_SUCCESS = 'EXPORT_DATASET_SUCCESS',
    EXPORT_DATASET_FAILED = 'EXPORT_DATASET_FAILED',
    EXPORT_BACKUP = 'EXPORT_BACKUP',
    EXPORT_BACKUP_SUCCESS = 'EXPORT_BACKUP_SUCCESS',
    EXPORT_BACKUP_FAILED = 'EXPORT_BACKUP_FAILED',
}

export const exportActions = {
    openExportModal: (instance: any, resource: 'dataset' | 'backup') => (
        createAction(ExportActionTypes.OPEN_EXPORT_MODAL, { instance, resource })
    ),
    closeExportModal: () => createAction(ExportActionTypes.CLOSE_EXPORT_MODAL),
    exportDataset: (instance: any, format: string) => (
        createAction(ExportActionTypes.EXPORT_DATASET, { instance, format })
    ),
    exportDatasetSuccess: (instance: any, format: string, isLocal: boolean) => (
        createAction(ExportActionTypes.EXPORT_DATASET_SUCCESS, { instance, format, isLocal })
    ),
    exportDatasetFailed: (instance: any, format: string, error: any) => (
        createAction(ExportActionTypes.EXPORT_DATASET_FAILED, {
            instance,
            format,
            error,
        })
    ),
    exportBackup: (instanceId: number) => (
        createAction(ExportActionTypes.EXPORT_BACKUP, { instanceId })
    ),
    exportBackupSuccess: (instanceId: number, instanceType: 'task' | 'project', isLocal: boolean) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_SUCCESS, { instanceId, instanceType, isLocal })
    ),
    exportBackupFailed: (instanceId: number, instanceType: 'task' | 'project', error: any) => (
        createAction(ExportActionTypes.EXPORT_BACKUP_FAILED, { instanceId, instanceType, error })
    ),
};

export const exportDatasetAsync = (
    instance: any,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage: Storage,
    name?: string
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportDataset(instance, format));

    try {
        const result = await instance.annotations.exportDataset(format, saveImages, useDefaultSettings, targetStorage, name);
        if (result) {
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = result;
            downloadAnchor.click();
        }
        dispatch(exportActions.exportDatasetSuccess(instance, format, !!result));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, format, error));
    }
};

export const exportBackupAsync = (instance: any, targetStorage: Storage, useDefaultSetting: boolean, fileName?: string): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportBackup(instance.id));
    const instanceType = (instance instanceof core.classes.Project) ? 'project' : 'task';

    try {
        const result = await instance.backup(targetStorage, useDefaultSetting, fileName);
        if (result) {
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = result;
            downloadAnchor.click();
        }
        dispatch(exportActions.exportBackupSuccess(instance.id, instanceType, !!result));
    } catch (error) {
        dispatch(exportActions.exportBackupFailed(instance.id, instanceType,  error as Error));
    }
};

export type ExportActions = ActionUnion<typeof exportActions>;
