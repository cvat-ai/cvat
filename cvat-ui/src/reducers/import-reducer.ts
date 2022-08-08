// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';

import { ImportDatasetState } from './interfaces';

import getCore from 'cvat-core-wrapper';

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
    // projects: {},
    // tasks: {},
    // jobs: {},
    //resource: null,
    // progress: 0.0,
    // status: '',
    // instance: null,
    // importingId: null,
    // modalVisible: false,
    projects: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
        // instance: null,
        // modalVisible: false,
    },
    tasks: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
        // instance: null,
        // modalVisible: false,
    },
    jobs: {
        activities: {},
        importingId: null,
        progress: defaultProgress,
        status: defaultStatus,
        // instance: null,
        // modalVisible: false,
    },
    instance: null,
    importing: false,
    // instanceType: null,
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
                    // modalVisible: true,
                    // instance: instance,
                },
                // instanceType: instanceType,
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
                    // modalVisible: false,
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
                },
                importing: true,
                //importingId: id,
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
                    // importingId: null,
                    //instance: null,
                    activities: {
                        ...activities
                    },
                },
                //instanceType: null,
                instance: null,
                resource: null,
                importing: false,
                // progress: defaultState.progress,
                // status: defaultState.status,
                // // importingId: null,
                // instance: null,
                // [instances]: {
                //     ...activities,
                // }
            };
        }
        default:
            return state;
    }
};
