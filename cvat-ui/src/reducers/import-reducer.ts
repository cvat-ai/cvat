// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';

import { ImportState } from './interfaces';

const defaultState: ImportState = {
    progress: 0.0,
    status: '',
    instance: null,
    importingId: null,
    modalVisible: false,
};

export default (state: ImportState = defaultState, action: ImportActions): ImportState => {
    switch (action.type) {
        case ImportActionTypes.OPEN_IMPORT_MODAL:
            return {
                ...state,
                modalVisible: true,
                instance: action.payload.instance,
            };
        case ImportActionTypes.CLOSE_IMPORT_MODAL: {
            return {
                ...state,
                modalVisible: false,
                instance: null,
            };
        }
        case ImportActionTypes.IMPORT_DATASET: {
            const { id } = action.payload;

            return {
                ...state,
                importingId: id,
                status: 'The file is being uploaded to the server',
            };
        }
        case ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS: {
            const { progress, status } = action.payload;
            return {
                ...state,
                progress,
                status,
            };
        }
        case ImportActionTypes.IMPORT_DATASET_FAILED:
        case ImportActionTypes.IMPORT_DATASET_SUCCESS: {
            return {
                ...state,
                progress: defaultState.progress,
                status: defaultState.status,
                importingId: null,
            };
        }
        default:
            return state;
    }
};
