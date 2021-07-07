// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import { ExportState } from './interfaces';

const defaultState: ExportState = {
    tasks: {
        datasets: {},
        annotation: {},
    },
    projects: {
        datasets: {},
        annotation: {},
    },
    instance: null,
    modalVisible: false,
};

export default (state: ExportState = defaultState, action: ExportActions): ExportState => {
    switch (action.type) {
        case ExportActionTypes.OPEN_EXPORT_MODAL:
            return {
                ...state,
                modalVisible: true,
                instance: action.payload.instance,
            };
        case ExportActionTypes.CLOSE_EXPORT_MODAL:
            return {
                ...state,
                modalVisible: false,
                instance: null,
            };
        default:
            return state;
    }
};
