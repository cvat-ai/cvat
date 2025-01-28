// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ImportActions, ImportActionTypes } from 'actions/import-actions';
import { getInstanceType, RequestInstanceType } from 'actions/requests-actions';
import { ProjectOrTaskOrJob } from 'cvat-core-wrapper';
import { ImportState } from '.';

const defaultProgress = 0.0;

export function defineActititiesField(instance: ProjectOrTaskOrJob | RequestInstanceType): 'projects' | 'tasks' | 'jobs' {
    return `${getInstanceType(instance)}s`;
}

const defaultState: ImportState = {
    projects: {
        dataset: {
            modalInstance: null,
            uploadState: {
                id: null,
                format: '',
                progress: 0,
                status: '',
            },
        },
        backup: {
            modalVisible: false,
            importing: false,
        },
    },
    tasks: {
        dataset: {
            modalInstance: null,
        },
        backup: {
            modalVisible: false,
            importing: false,
        },
    },
    jobs: {
        dataset: {
            modalInstance: null,
        },
    },
    instanceType: null,
};

export default (state: ImportState = defaultState, action: ImportActions): ImportState => {
    switch (action.type) {
        case ImportActionTypes.OPEN_IMPORT_DATASET_MODAL: {
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
        case ImportActionTypes.CLOSE_IMPORT_DATASET_MODAL: {
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
        case ImportActionTypes.IMPORT_DATASET: {
            const { format, instance } = action.payload;

            const activitiesField = defineActititiesField(instance);

            let updatedActivity: {
                id: number;
                format: string;
                status?: string;
                progress?: number;
            } = { format, id: instance.id };
            if (activitiesField === 'projects') {
                updatedActivity = {
                    ...updatedActivity,
                    status: 'The file is being uploaded to the server',
                    progress: defaultProgress,
                };
                return {
                    ...state,
                    [activitiesField]: {
                        ...state[activitiesField],
                        dataset: {
                            ...state[activitiesField].dataset,
                            uploadState: {
                                ...state[activitiesField].dataset.uploadState,
                                ...updatedActivity,
                            },
                        },
                    },
                };
            }
            return state;
        }
        case ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS: {
            const { progress, status, instance } = action.payload;

            const activitiesField = defineActititiesField(instance);
            if (activitiesField === 'projects') {
                return {
                    ...state,
                    [activitiesField]: {
                        ...state[activitiesField],
                        dataset: {
                            ...state[activitiesField].dataset,
                            uploadState: {
                                ...state[activitiesField].dataset.uploadState,
                                progress,
                                status,
                            },
                        },
                    },
                };
            }
            return state;
        }
        case ImportActionTypes.OPEN_IMPORT_BACKUP_MODAL: {
            const { instanceType } = action.payload;
            const field = `${instanceType}s` as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        modalVisible: true,
                        importing: false,
                    },
                },
                instanceType,
            };
        }
        case ImportActionTypes.CLOSE_IMPORT_BACKUP_MODAL: {
            const { instanceType } = action.payload;
            const field = `${instanceType}s` as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        modalVisible: false,
                    },
                },
                instanceType: null,
            };
        }
        case ImportActionTypes.IMPORT_BACKUP: {
            const { instanceType } = state;
            const field = `${instanceType}s` as 'projects' | 'tasks';

            return {
                ...state,
                [field]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        importing: true,
                    },
                },
            };
        }
        case ImportActionTypes.IMPORT_BACKUP_FAILED:
        case ImportActionTypes.IMPORT_BACKUP_SUCCESS: {
            const { instanceType } = action.payload;
            const field = `${instanceType}s` as 'projects' | 'tasks';

            return {
                ...state,
                [`${instanceType}s`]: {
                    ...state[field],
                    backup: {
                        ...state[field].backup,
                        importing: false,
                    },
                },
            };
        }
        default:
            return state;
    }
};
