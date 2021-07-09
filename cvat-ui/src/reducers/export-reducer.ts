// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';
import { ExportState } from './interfaces';

const core = getCore();

const defaultState: ExportState = {
    tasks: {
        datasets: {},
        annotations: {},
    },
    projects: {
        datasets: {},
        annotations: {},
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
        case ExportActionTypes.EXPORT_DATASET: {
            const { instance, format, saveImages } = action.payload;
            let activities;
            if (instance instanceof core.classes.Project) {
                activities = saveImages ? state.projects.datasets : state.projects.annotations;
            } else {
                activities = saveImages ? state.tasks.datasets : state.tasks.annotations;
            }

            activities[instance.id] =
                instance.id in activities && !activities[instance.id].includes(format) ?
                    [...activities[instance.id], format] :
                    activities[instance.id] || [format];

            return {
                ...state,
                tasks: {
                    datasets: instance instanceof core.classes.Task && saveImages ? activities : state.tasks.datasets,
                    annotations:
                        instance instanceof core.classes.Task && !saveImages ? activities : state.tasks.annotations,
                },
                projects: {
                    datasets:
                        instance instanceof core.classes.Project && saveImages ? activities : state.projects.datasets,
                    annotations:
                        instance instanceof core.classes.Project && !saveImages ?
                            activities :
                            state.projects.annotations,
                },
            };
        }
        case ExportActionTypes.EXPORT_DATASET_FAILED:
        case ExportActionTypes.EXPORT_DATASET_SUCCESS: {
            const { instance, format, saveImages } = action.payload;
            let activities;
            if (instance instanceof core.classes.Project) {
                activities = saveImages ? state.projects.datasets : state.projects.annotations;
            } else {
                activities = saveImages ? state.tasks.datasets : state.tasks.annotations;
            }

            activities[instance.id] = activities[instance.id].filter(
                (exporterName: string): boolean => exporterName !== format,
            );

            return {
                ...state,
                tasks: {
                    datasets: instance instanceof core.classes.Task && saveImages ? activities : state.tasks.datasets,
                    annotations:
                        instance instanceof core.classes.Task && !saveImages ? activities : state.tasks.annotations,
                },
                projects: {
                    datasets:
                        instance instanceof core.classes.Project && saveImages ? activities : state.projects.datasets,
                    annotations:
                        instance instanceof core.classes.Project && !saveImages ?
                            activities :
                            state.projects.annotations,
                },
            };
        }
        default:
            return state;
    }
};
