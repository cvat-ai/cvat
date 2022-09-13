// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';
import { omit } from 'lodash';
import deepCopy from 'utils/deep-copy';

import { ExportState } from '.';
import { defineActititiesField } from './import-reducer';

const defaultState: ExportState = {
    projects: {
        dataset: {
            current: {},
            modalInstance: null,
        },
        backup: {
            modalInstance: null,
            current: {},
        },
    },
    tasks: {
        dataset: {
            current: {},
            modalInstance: null,
        },
        backup: {
            modalInstance: null,
            current: {},
        },
    },
    jobs: {
        dataset: {
            current: {},
            modalInstance: null,
        },
    },
    instanceType: null,
};

export default (state: ExportState = defaultState, action: ExportActions): ExportState => {
    switch (action.type) {
        case ExportActionTypes.OPEN_EXPORT_DATASET_MODAL: {
            const { instance } = action.payload;
            const activitiesField = defineActititiesField(instance);

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    dataset: {
                        ...state[activitiesField].dataset,
                        modalInstance: instance,
                    },
                },
                instanceType: activitiesField
                    .slice(0, activitiesField.length - 1) as 'project' | 'task' | 'job',
            };
        }
        case ExportActionTypes.CLOSE_EXPORT_DATASET_MODAL: {
            const { instance } = action.payload;
            const activitiesField = defineActititiesField(instance);

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    dataset: {
                        ...state[activitiesField].dataset,
                        modalInstance: null,
                    },
                },
                instanceType: null,
            };
        }
        case ExportActionTypes.EXPORT_DATASET: {
            const { instance, format } = action.payload;
            const field = defineActititiesField(instance) as 'projects' | 'tasks' | 'jobs';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    dataset: {
                        ...state[field].dataset,
                        current: {
                            ...state[field].dataset.current,
                            [instance.id]: !state[field].dataset.current[instance.id] ? [format] :
                                [...state[field].dataset.current[instance.id], format],
                        },
                    },
                },
            };
        }
        case ExportActionTypes.EXPORT_DATASET_FAILED:
        case ExportActionTypes.EXPORT_DATASET_SUCCESS: {
            const { instance, format } = action.payload;
            const field: 'projects' | 'tasks' | 'jobs' = defineActititiesField(instance);
            const activities = deepCopy(state[field]);

            activities.dataset.current[instance.id] = activities.dataset.current[instance.id].filter(
                (exporterName: string): boolean => exporterName !== format,
            );

            return {
                ...state,
                [field]: activities,
            };
        }
        case ExportActionTypes.OPEN_EXPORT_BACKUP_MODAL: {
            const { instance } = action.payload;
            const field = defineActititiesField(instance) as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        modalInstance: instance,
                    },
                },
                instanceType: field
                    .slice(0, field.length - 1) as 'project' | 'task',
            };
        }
        case ExportActionTypes.CLOSE_EXPORT_BACKUP_MODAL: {
            const { instance } = action.payload;
            const field = defineActititiesField(instance) as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        modalInstance: null,
                    },
                },
                instanceType: null,
            };
        }
        case ExportActionTypes.EXPORT_BACKUP: {
            const { instance } = action.payload;
            const field = defineActititiesField(instance) as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        current: {
                            ...state[field].backup.current,
                            [instance.id]: true,
                        },
                    },
                },
            };
        }
        case ExportActionTypes.EXPORT_BACKUP_FAILED:
        case ExportActionTypes.EXPORT_BACKUP_SUCCESS: {
            const { instance } = action.payload;

            const field = defineActititiesField(instance) as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        current: omit(state[field].backup, instance.id),
                    },
                },
            };
        }
        default:
            return state;
    }
};
