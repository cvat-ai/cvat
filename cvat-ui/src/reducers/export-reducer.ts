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
    modalVisible: false,
};

export default (state: ExportState = defaultState, action: ExportActions): ExportState => {
    switch (action.type) {
        case ExportActionTypes.TOGGLE_EXPORT_MODAL_VISIBLE:
            return {
                ...state,
                modalVisible: !state.modalVisible,
            };
        default:
            return state;
    }
};
