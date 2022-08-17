// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';
import { ImportDatasetState } from '.';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();

const defaultProgress = 0.0;
const defaultStatus = '';

function defineActititiesField(instance: any): 'projects' | 'tasks' | 'jobs' {
    let field: 'projects' | 'tasks' | 'jobs';
    if  (instance instanceof core.classes.Project) {
        field = 'projects';
    } else if (instance instanceof core.classes.Task) {
        field = 'tasks';
    } else { // job
        field = 'jobs';
    }
    return field;
}

const defaultState: ImportDatasetState = {
    projects: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
    },
    tasks: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
    },
    jobs: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
    },
    instance: null,
    importing: false,
    resource: null,
    modalVisible: false,
};

export default (state: ImportDatasetState = defaultState, action: ImportActions): ImportDatasetState => {
    switch (action.type) {
        case ImportActionTypes.OPEN_IMPORT_MODAL:
            const { instance, resource } = action.payload;
            const activitiesField = defineActititiesField(instance);

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                },
                instance: instance,
                resource: resource,
                modalVisible: true,
            };
        case ImportActionTypes.CLOSE_IMPORT_MODAL: {
            const { instance } = action.payload;
            const activitiesField = defineActititiesField(instance);

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                },
                resource: null,
                instance: null,
                modalVisible: false,
            };
        }
        case ImportActionTypes.IMPORT_DATASET: {
            const { format, instance } = action.payload;

            const activitiesField = defineActititiesField(instance);

            const activities = state[activitiesField]?.activities;
            activities[instance.id] = instance.id in activities ? activities[instance.id] : format;

            return {
                ...state,
                [activitiesField]: {
                    activities: {
                        ...activities,
                    },
                    status: 'The file is being uploaded to the server',
                    importingId: instance.id,
                },
                importing: true,
            };
        }
        case ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS: {
            const { progress, status, instance } = action.payload;

            const activitiesField = defineActititiesField(instance);
            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    progress,
                    status,
                }
            };
        }
        case ImportActionTypes.IMPORT_DATASET_FAILED:
        case ImportActionTypes.IMPORT_DATASET_SUCCESS: {
            const { instance } = action.payload;

            const activitiesField = defineActititiesField(instance);
            const activities = state[activitiesField]?.activities;
            delete activities[instance.id];

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    progress: defaultProgress,
                    status: defaultStatus,
                    importingId: null,
                    activities: {
                        ...activities
                    },
                },
                instance: null,
                resource: null,
                importing: false,
            };
        }
        default:
            return state;
    }
};
