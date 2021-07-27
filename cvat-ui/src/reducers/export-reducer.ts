// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';
import deepCopy from 'utils/deep-copy';

import { ExportState } from './interfaces';

const core = getCore();

const defaultState: ExportState = {
    tasks: {},
    projects: {},
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
        case ExportActionTypes.EXPORT_DATASET: {
            const { instance, format } = action.payload;
            const activities = deepCopy(instance instanceof core.classes.Project ? state.projects : state.tasks);

            activities[instance.id] =
                instance.id in activities && !activities[instance.id].includes(format) ?
                    [...activities[instance.id], format] :
                    activities[instance.id] || [format];

            return {
                ...state,
                tasks: instance instanceof core.classes.Task ? activities : state.tasks,
                projects: instance instanceof core.classes.Project ? activities : state.projects,
            };
        }
        case ExportActionTypes.EXPORT_DATASET_FAILED:
        case ExportActionTypes.EXPORT_DATASET_SUCCESS: {
            const { instance, format } = action.payload;
            const activities = deepCopy(instance instanceof core.classes.Project ? state.projects : state.tasks);

            activities[instance.id] = activities[instance.id].filter(
                (exporterName: string): boolean => exporterName !== format,
            );

            return {
                ...state,
                tasks: instance instanceof core.classes.Task ? activities : state.tasks,
                projects: instance instanceof core.classes.Project ? activities : state.projects,
            };
        }
        default:
            return state;
    }
};
