// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

export enum ExportActionTypes {
    OPEN_EXPORT_MODAL = 'OPEN_EXPORT_MODAL',
    CLOSE_EXPORT_MODAL = 'CLOSE_EXPORT_MODAL',
    EXPORT_DATASET = 'EXPORT_DATASET',
    EXPORT_DATASET_SUCCESS = 'EXPORT_DATASET_SUCCESS',
    EXPORT_DATASET_FAILED = 'EXPORT_DATASET_FAILED',
}

export const exportActions = {
    openExportModal: (instance: any) => createAction(ExportActionTypes.OPEN_EXPORT_MODAL, { instance }),
    closeExportModal: () => createAction(ExportActionTypes.CLOSE_EXPORT_MODAL),
    exportDataset: (instance: any, format: string) => (
        createAction(ExportActionTypes.EXPORT_DATASET, { instance, format })
    ),
    exportDatasetSuccess: (instance: any, format: string) => (
        createAction(ExportActionTypes.EXPORT_DATASET_SUCCESS, { instance, format })
    ),
    exportDatasetFailed: (instance: any, format: string, error: any) => (
        createAction(ExportActionTypes.EXPORT_DATASET_FAILED, {
            instance,
            format,
            error,
        })
    ),
};

export const exportDatasetAsync = (
    instance: any,
    format: string,
    name: string,
    saveImages: boolean,
): ThunkAction => async (dispatch) => {
    dispatch(exportActions.exportDataset(instance, format));

    try {
        const url = await instance.annotations.exportDataset(format, saveImages, name);
        const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
        downloadAnchor.href = url;
        downloadAnchor.click();
        dispatch(exportActions.exportDatasetSuccess(instance, format));
    } catch (error) {
        dispatch(exportActions.exportDatasetFailed(instance, format, error));
    }
};

export type ExportActions = ActionUnion<typeof exportActions>;
