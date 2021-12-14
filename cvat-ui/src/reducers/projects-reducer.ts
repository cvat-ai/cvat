// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { omit } from 'lodash';
import { ProjectsActionTypes } from 'actions/projects-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActionTypes } from 'actions/auth-actions';

import { Project, ProjectsState } from './interfaces';

const defaultState: ProjectsState = {
    initialized: false,
    fetching: false,
    count: 0,
    current: [],
    gettingQuery: {
        page: 1,
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
    },
    tasksGettingQuery: {
        page: 1,
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
        mode: null,
        projectId: null,
        ordering: 'subset',
    },
    activities: {
        deletes: {},
        creates: {
            id: null,
            error: '',
        },
        backups: {},
    },
    restoring: false,
};

export default (state: ProjectsState = defaultState, action: AnyAction): ProjectsState => {
    switch (action.type) {
        case ProjectsActionTypes.UPDATE_PROJECTS_GETTING_QUERY:
            return {
                ...state,
                gettingQuery: {
                    ...defaultState.gettingQuery,
                    ...action.payload.query,
                },
                tasksGettingQuery: {
                    ...defaultState.tasksGettingQuery,
                    ...action.payload.tasksQuery,
                },
            };
        case ProjectsActionTypes.GET_PROJECTS:
            return {
                ...state,
                initialized: false,
                fetching: true,
                count: 0,
                current: [],
            };
        case ProjectsActionTypes.GET_PROJECTS_SUCCESS: {
            const combinedWithPreviews = action.payload.array.map(
                (project: any, index: number): Project => ({
                    instance: project,
                    preview: action.payload.previews[index],
                }),
            );

            return {
                ...state,
                initialized: true,
                fetching: false,
                count: action.payload.count,
                current: combinedWithPreviews,
            };
        }
        case ProjectsActionTypes.GET_PROJECTS_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        case ProjectsActionTypes.CREATE_PROJECT: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        id: null,
                        error: '',
                    },
                },
            };
        }
        case ProjectsActionTypes.CREATE_PROJECT_FAILED: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        error: action.payload.error.toString(),
                    },
                },
            };
        }
        case ProjectsActionTypes.CREATE_PROJECT_SUCCESS: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        id: action.payload.projectId,
                        error: '',
                    },
                },
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT: {
            return {
                ...state,
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT_SUCCESS: {
            return {
                ...state,
                current: state.current.map(
                    (project): Project => ({
                        ...project,
                        instance:
                            project.instance.id === action.payload.project.id ?
                                action.payload.project :
                                project.instance,
                    }),
                ),
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT_FAILED: {
            return {
                ...state,
                current: state.current.map(
                    (project): Project => ({
                        ...project,
                        instance:
                            project.instance.id === action.payload.project.id ?
                                action.payload.project :
                                project.instance,
                    }),
                ),
            };
        }
        case ProjectsActionTypes.DELETE_PROJECT: {
            const { projectId } = action.payload;
            const { deletes } = state.activities;

            deletes[projectId] = false;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case ProjectsActionTypes.DELETE_PROJECT_SUCCESS: {
            const { projectId } = action.payload;
            const { deletes } = state.activities;

            deletes[projectId] = true;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case ProjectsActionTypes.DELETE_PROJECT_FAILED: {
            const { projectId } = action.payload;
            const { deletes } = state.activities;

            delete deletes[projectId];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case ProjectsActionTypes.BACKUP_PROJECT: {
            const { projectId } = action.payload;
            const { backups } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    backups: {
                        ...backups,
                        ...Object.fromEntries([[projectId, true]]),
                    },
                },
            };
        }
        case ProjectsActionTypes.BACKUP_PROJECT_FAILED:
        case ProjectsActionTypes.BACKUP_PROJECT_SUCCESS: {
            const { projectID } = action.payload;
            const { backups } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    backups: omit(backups, [projectID]),
                },
            };
        }
        case ProjectsActionTypes.RESTORE_PROJECT: {
            return {
                ...state,
                restoring: true,
            };
        }
        case ProjectsActionTypes.RESTORE_PROJECT_FAILED:
        case ProjectsActionTypes.RESTORE_PROJECT_SUCCESS: {
            return {
                ...state,
                restoring: false,
            };
        }

        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
};
