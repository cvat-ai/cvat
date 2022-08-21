// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import { getCore } from 'cvat-core-wrapper';
import deepCopy from 'utils/deep-copy';

import { ExportState } from '.';

const core = getCore();

const defaultState: ExportState = {
    tasks: {},
    projects: {},
    jobs: {},
    resource: null,
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
                resource: action.payload.resource,
            };
        case ExportActionTypes.CLOSE_EXPORT_MODAL:
            return {
                ...state,
                modalVisible: false,
                // instance: null,
                // resource: null,
            };
        case ExportActionTypes.EXPORT_DATASET: {
            const { instance, format } = action.payload;
            let activities;
            let field;
            if (instance instanceof core.classes.Project) {
                activities = deepCopy(state.projects);
                field = 'projects';
            } else if (instance instanceof core.classes.Task) {
                activities = deepCopy(state.tasks);
                field = 'tasks';
            } else {
                activities = deepCopy(state.jobs);
                field = 'jobs';
            }

            const instanceId = instance.id;

            if (!activities[instanceId]) {
                activities[instanceId] = {
                    'dataset': [],
                    'backup': false,
                }
            }
            activities[instanceId].dataset =
                instanceId in activities && activities[instanceId].dataset
                && !activities[instanceId].dataset.includes(format) ?
                    [...activities[instanceId].dataset, format] :
                    activities[instanceId]?.dataset || [format];

            return {
                ...state,
                ...{[field]: activities},
            };
        }
        case ExportActionTypes.EXPORT_DATASET_FAILED:
        case ExportActionTypes.EXPORT_DATASET_SUCCESS: {
            const { instance, format } = action.payload;
            let activities;
            let field;
            if (instance instanceof core.classes.Project) {
                activities = deepCopy(state.projects);
                field = 'projects';
            } else if (instance instanceof core.classes.Task) {
                activities = deepCopy(state.tasks);
                field = 'tasks';
            } else {
                activities = deepCopy(state.jobs);
                field = 'jobs';
            }

            const instanceId = instance.id;

            activities[instanceId].dataset = activities[instanceId].dataset.filter(
                (exporterName: string): boolean => exporterName !== format,
            );

            return {
                ...state,
                ...{[field]: activities},
            };
        }
        case ExportActionTypes.EXPORT_BACKUP: {
            const { instanceId } = action.payload;
            const { instance } = state;

            let activities;
            let field;
            if (instance instanceof core.classes.Project) {
                activities = deepCopy(state.projects);
                field = 'projects';
            } else if (instance instanceof core.classes.Task) {
                activities = deepCopy(state.tasks);
                field = 'tasks';
            } else {
                activities = deepCopy(state.jobs);
                field = 'jobs';
            }

            activities[instanceId] = {
                ...activities[instanceId],
                'backup': true,
            }

            return {
                ...state,
                [field]: {
                    ...activities,
                }
            };
        }
        case ExportActionTypes.EXPORT_BACKUP_FAILED:
        case ExportActionTypes.EXPORT_BACKUP_SUCCESS: {
            const { instanceId } = action.payload;

            const { instance } = state;

            let activities;
            let field;
            if (instance instanceof core.classes.Project) {
                activities = deepCopy(state.projects);
                field = 'projects';
            } else if (instance instanceof core.classes.Task) {
                activities = deepCopy(state.tasks);
                field = 'tasks';
            } else {
                activities = deepCopy(state.jobs);
                field = 'jobs';
            }

            activities[instanceId] = {
                ...activities[instanceId],
                'backup': false,
            }

            return {
                ...state,
                [field]: {
                    ...activities,
                },
                instance: null,
                resource: null,
            };
        }
        default:
            return state;
    }
};
