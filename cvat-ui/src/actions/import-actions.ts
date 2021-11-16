// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers/interfaces';
import { getProjectsAsync } from './projects-actions';

export enum ImportActionTypes {
    OPEN_IMPORT_MODAL = 'OPEN_IMPORT_MODAL',
    CLOSE_IMPORT_MODAL = 'CLOSE_IMPORT_MODAL',
    IMPORT_DATASET = 'IMPORT_DATASET',
    IMPORT_DATASET_SUCCESS = 'IMPORT_DATASET_SUCCESS',
    IMPORT_DATASET_FAILED = 'IMPORT_DATASET_FAILED',
    IMPORT_DATASET_UPDATE_STATUS = 'IMPORT_DATASET_UPDATE_STATUS',
}

export const importActions = {
    openImportModal: (instance: any) => createAction(ImportActionTypes.OPEN_IMPORT_MODAL, { instance }),
    closeImportModal: () => createAction(ImportActionTypes.CLOSE_IMPORT_MODAL),
    importDataset: (instance: any, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: any, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance, format })
    ),
    importDatasetFailed: (instance: any, error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            error,
        })
    ),
    importDatasetUpdateStatus: (progress: number, status: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS, { progress, status })
    ),
};

export const importDatasetAsync = (instance: any, format: string, file: File): ThunkAction => async (dispatch, getState) => {
    try {
        const state: CombinedState = getState();
        if (state.import.projects[instance.id]) {
            throw Error('Only one importing of dataset allowed at the same time');
        }
        dispatch(importActions.importDataset(instance, format));
        await instance.annotations.importDataset(format, file, (response: any) => (
            dispatch(importActions.importDatasetUpdateStatus(response.progress * 100, response.message))
        ));
    } catch (error) {
        dispatch(importActions.importDatasetFailed(instance, error));
        return;
    }

    dispatch(importActions.importDatasetSuccess(instance, format));
    dispatch(getProjectsAsync({ id: instance.id }));
};

export type ImportActions = ActionUnion<typeof importActions>;
