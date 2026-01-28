// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ExportActions, ExportActionTypes } from 'actions/export-actions';

import { ExportState } from '.';
import { defineActititiesField } from './import-reducer';

const defaultState: ExportState = {
    projects: {
        dataset: {
            modalInstance: null,
        },
        backup: {
            modalInstance: null,
        },
    },
    tasks: {
        dataset: {
            modalInstance: null,
        },
        backup: {
            modalInstance: null,
        },
    },
    jobs: {
        dataset: {
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
        default:
            return state;
    }
};
