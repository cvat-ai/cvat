// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { omit } from 'lodash';

import { ProjectsActionTypes } from 'actions/projects-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { SelectionActionsTypes } from 'actions/selection-actions';
import { ProjectsState, SelectedResourceType } from '.';

const defaultState: ProjectsState = {
    fetchingTimestamp: Date.now(),
    initialized: false,
    fetching: false,
    count: 0,
    current: [],
    selected: [],
    previews: {},
    gettingQuery: {
        page: 1,
        pageSize: 12,
        id: null,
        search: null,
        filter: null,
        sort: null,
    },
    tasksGettingQuery: {
        page: 1,
        pageSize: 10,
        id: null,
        search: null,
        filter: null,
        sort: null,
        projectId: null,
        ordering: 'subset',
    },
    activities: {
        deletes: {},
        creates: {
            id: null,
            error: '',
        },
        updates: {},
    },
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
                fetchingTimestamp: action.payload.fetchingTimestamp,
                initialized: false,
                fetching: true,
                count: 0,
                current: [],
            };
        case ProjectsActionTypes.GET_PROJECTS_SUCCESS: {
            return {
                ...state,
                initialized: true,
                fetching: false,
                count: action.payload.count,
                current: action.payload.array,
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
        case ProjectsActionTypes.DELETE_PROJECT: {
            const { projectId } = action.payload;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...state.activities.deletes,
                        [projectId]: false,
                    },
                },
            };
        }
        case ProjectsActionTypes.DELETE_PROJECT_SUCCESS: {
            const { projectId } = action.payload;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...state.activities.deletes,
                        [projectId]: true,
                    },
                },
            };
        }
        case ProjectsActionTypes.DELETE_PROJECT_FAILED: {
            const { projectId } = action.payload;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: omit(state.activities.deletes, projectId),
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case ProjectsActionTypes.GET_PROJECT_PREVIEW: {
            const { projectID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [projectID]: {
                        preview: '',
                        fetching: true,
                        initialized: false,
                    },
                },
            };
        }
        case ProjectsActionTypes.GET_PROJECT_PREVIEW_SUCCESS: {
            const { projectID, preview } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [projectID]: {
                        preview,
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case ProjectsActionTypes.GET_PROJECT_PREVIEW_FAILED: {
            const { projectID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [projectID]: {
                        ...previews[projectID],
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT: {
            const { projectId } = action.payload;
            return {
                ...state,
                fetching: true,
                activities: {
                    ...state.activities,
                    updates: {
                        ...state.activities.updates,
                        [projectId]: true,
                    },
                },
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT_SUCCESS: {
            const { project } = action.payload;
            const { updates } = state.activities;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    updates: omit(updates, project.id),
                },
                current: state.current.map((projectInstance) => {
                    if (projectInstance.id === project.id) {
                        return project;
                    }
                    return projectInstance;
                }),
                fetching: false,
            };
        }
        case ProjectsActionTypes.UPDATE_PROJECT_FAILED: {
            const { projectId } = action.payload;
            const { updates } = state.activities;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    updates: omit(updates, projectId),
                },
            };
        }
        case SelectionActionsTypes.DESELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.PROJECTS) {
                return {
                    ...state,
                    selected: state.selected.filter((id: number) => !action.payload.resourceIds.includes(id)),
                };
            }
            return state;
        }
        case SelectionActionsTypes.SELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.PROJECTS) {
                return {
                    ...state,
                    selected: Array.from(new Set([...state.selected, ...action.payload.resourceIds])),
                };
            }
            return state;
        }
        case SelectionActionsTypes.CLEAR_SELECTED_RESOURCES: {
            return { ...state, selected: [] };
        }
        default:
            return state;
    }
};
