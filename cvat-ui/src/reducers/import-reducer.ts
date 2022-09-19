// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import { ImportActions, ImportActionTypes } from 'actions/import-actions';
import { getCore } from 'cvat-core-wrapper';
import { ImportState } from '.';

const core = getCore();

const defaultProgress = 0.0;

export function defineActititiesField(instance: any): 'projects' | 'tasks' | 'jobs' {
    if (instance instanceof core.classes.Project) {
        return 'projects';
    }
    if (instance instanceof core.classes.Task) {
        return 'tasks';
    }
    return 'jobs';
}

const defaultState: ImportState = {
    projects: {
        dataset: {
            modalInstance: null,
            current: {},
        },
        backup: {
            modalVisible: false,
            importing: false,
        },
    },
    tasks: {
        dataset: {
            modalInstance: null,
            current: {},
        },
        backup: {
            modalVisible: false,
            importing: false,
        },
    },
    jobs: {
        dataset: {
            modalInstance: null,
            current: {},
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
                format: string;
                status?: string;
                progress?: number;
            } = { format };
            if (activitiesField === 'projects') {
                updatedActivity = {
                    ...updatedActivity,
                    status: 'The file is being uploaded to the server',
                    progress: defaultProgress,
                };
            }
            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    dataset: {
                        ...state[activitiesField].dataset,
                        current: {
                            ...state[activitiesField].dataset.current,
                            [instance.id]: updatedActivity,
                        },
                    },
                },
            };
        }
        case ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS: {
            const { progress, status, instance } = action.payload;

            const activitiesField = defineActititiesField(instance);
            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    dataset: {
                        ...state[activitiesField].dataset,
                        current: {
                            ...state[activitiesField].dataset.current,
                            [instance.id]: {
                                ...state[activitiesField].dataset.current[instance.id] as Record<string, unknown>,
                                progress,
                                status,
                            },
                        },
                    },
                },
            };
        }
        case ImportActionTypes.IMPORT_DATASET_FAILED:
        case ImportActionTypes.IMPORT_DATASET_SUCCESS: {
            const { instance } = action.payload;
            const activitiesField = defineActititiesField(instance);
            const { current } = state[activitiesField].dataset;

            return {
                ...state,
                [activitiesField]: {
                    ...state[activitiesField],
                    dataset: {
                        ...state[activitiesField].dataset,
                        current: omit(current, instance.id),
                    },
                },
            };
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
