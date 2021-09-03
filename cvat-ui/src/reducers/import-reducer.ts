// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';
import deepCopy from 'utils/deep-copy';

import { ImportState } from './interfaces';

const defaultState: ImportState = {
    projects: {},
    instance: null,
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
            const { instance, format } = action.payload;
            const activities = deepCopy(state.projects);

            activities[instance.id] = format;

            return {
                ...state,
                projects: activities,
            };
        }
        case ImportActionTypes.IMPORT_DATASET_FAILED:
        case ImportActionTypes.IMPORT_DATASET_SUCCESS: {
            const { instance } = action.payload;
            const activities = deepCopy(state.projects);

            delete activities[instance.id];

            return {
                ...state,
                projects: activities,
            };
        }
        default:
            return state;
    }
};
