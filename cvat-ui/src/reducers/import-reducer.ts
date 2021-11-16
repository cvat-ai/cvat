// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';

import { ImportState } from './interfaces';

const defaultState: ImportState = {
    progress: 0.0,
    status: '',
    instance: null,
    format: null,
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
            const { format } = action.payload;

            return {
                ...state,
                format,
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
                format: null,
            };
        }
        default:
            return state;
    }
};
