// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';
import deepCopy from 'utils/deep-copy';
import { omit } from 'lodash';

import { ExportState } from './interfaces';

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
                instance: null,
                resource: null,
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


            // deepCopy(instance instanceof core.classes.Project ? state.projects : state.tasks);
            // const instanceId = instance instanceof core.classes.Project ||
            //     instance instanceof core.classes.Task ? instance.id : instance.taskId;
            const instanceId = instance.id;

            activities[instanceId].dataset =
                instanceId in activities && !activities[instanceId].dataset.includes(format) ?
                    [...activities[instanceId].dataset, format] :
                    activities[instanceId].dataset || [format];

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
            // switch (typeof instance) {
            //     case core.classes.Project: {
            //         activities = deepCopy(state.projects);
            //         field = 'projects';
            //         break;
            //     }
            //     case core.classes.Task: {
            //         activities = deepCopy(state.tasks);
            //         field = 'tasks';
            //         break;
            //     }
            //     case core.classes.Job: {
            //         activities = deepCopy(state.jobs);
            //         field = 'jobs';
            //         break;
            //     }
            //     default:
            // }
            const instanceId = instance.id;

            // const activities = deepCopy(instance instanceof core.classes.Project ? state.projects : state.tasks);
            // const instanceId = instance instanceof core.classes.Project ||
            //     instance instanceof core.classes.Task ? instance.id : instance.taskId;

            activities[instanceId].dataset = activities[instanceId].dataset.filter(
                (exporterName: string): boolean => exporterName !== format,
            );

            return {
                ...state,
                ...{[field]: activities},
            };
        }
        case ExportActionTypes.EXPORT_TASK: {
            const { taskId } = action.payload;
            //const { backups } = state;

            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...state.tasks[taskId],
                        'backup': true,
                    }

                }
                // : {
                //     ...backups,
                //     ...Object.fromEntries([[taskId, true]]),
                // },
            };
        }
        case ExportActionTypes.EXPORT_TASK_FAILED:
        case ExportActionTypes.EXPORT_TASK_SUCCESS: {
            const { taskId } = action.payload;
            // const { backup } = state.tasks[taskId];

            // delete backup;

            // TODO taskid maybe undefined?
            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...state.tasks[taskId],
                        'backup': false,
                    }
                }
                // backups: omit(backups, [taskId]),
            };
        }
        default:
            return state;
    }
};
