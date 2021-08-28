// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionCreator, AnyAction, Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { getCVATStore } from 'cvat-store';
import { createAction } from 'utils/redux';
import { CombinedState } from 'reducers/interfaces';

export enum ImportActionType {
    OPEN_IMPORT_MODAL = 'OPEN_IMPORT_MODAL',
    CLOSE_IMPORT_MODAL = 'OPEN_IMPORT_MODAL',
    IMPORT_DATASET = 'IMPORT_DATASET',
    IMPORT_DATASET_SUCCESS = 'IMPORT_DATASET_SUCCESS',
    IMPORT_DATASET_FAILED = 'IMPORT_DATASET_FAILED',
}

export const importActions = {
    openImportModal: (instance: any) => createAction(ImportActionType.OPEN_IMPORT_MODAL, { instance }),
    closeImportModal: () => createAction(ImportActionType.CLOSE_IMPORT_MODAL),
    importDataset: (instance: any, format: string) =>
        createAction(ImportActionType.IMPORT_DATASET, { instance, format }),
    importDatasetSuccess: (instance: any, format: string) =>
        createAction(ImportActionType.IMPORT_DATASET_SUCCESS, { instance, format }),
    importDatasetFailed: (instance: any, format: string, error: any) =>
        createAction(ImportActionType.IMPORT_DATASET_FAILED, {
            instance,
            format,
            error,
        }),
};

export function importDatasetAsync(
    instance: any,
    format: string,
    file: File,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const store = getCVATStore();
            const state: CombinedState = store.getState();
            if (state.import.projects[instance.id]) {
                throw Error('Only one importing of dataset allowed at the same time')
            }
            dispatch(importActions.importDataset(instance, format));
            await instance.dataset.import(file, format);
        } catch (error) {
            dispatch(importActions.importDatasetFailed(instance, format, error));
            return;
        }

        dispatch(importActions.importDatasetSuccess(instance, format));
    };
}
