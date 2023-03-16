// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { TasksActionTypes } from 'actions/tasks-actions';
import { AuthActionTypes } from 'actions/auth-actions';

import { AnnotationActionTypes } from 'actions/annotation-actions';
import { TasksState } from '.';

const defaultState: TasksState = {
    initialized: false,
    fetching: false,
    hideEmpty: false,
    moveTask: {
        modalVisible: false,
        taskId: null,
    },
    count: 0,
    current: [],
    previews: {},
    gettingQuery: {
        page: 1,
        id: null,
        search: null,
        filter: null,
        sort: null,
        projectId: null,
    },
    activities: {
        deletes: {},
    },
};

export default (state: TasksState = defaultState, action: AnyAction): TasksState => {
    switch (action.type) {
        case TasksActionTypes.GET_TASKS:
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {},
                },
                initialized: false,
                fetching: true,
                hideEmpty: true,
                count: 0,
                gettingQuery: action.payload.updateQuery ? {
                    ...defaultState.gettingQuery,
                    ...action.payload.query,
                } : state.gettingQuery,
            };
        case TasksActionTypes.GET_TASKS_SUCCESS: {
            return {
                ...state,
                initialized: true,
                fetching: false,
                count: action.payload.count,
                current: action.payload.array,
            };
        }
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        case TasksActionTypes.DELETE_TASK: {
            const { taskID } = action.payload;
            const { deletes } = state.activities;

            deletes[taskID] = false;

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
        case TasksActionTypes.DELETE_TASK_SUCCESS: {
            const { taskID } = action.payload;
            const { deletes } = state.activities;

            deletes[taskID] = true;

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
        case TasksActionTypes.DELETE_TASK_FAILED: {
            const { taskID } = action.payload;
            const { deletes } = state.activities;

            delete deletes[taskID];

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
        case TasksActionTypes.HIDE_EMPTY_TASKS: {
            return {
                ...state,
                hideEmpty: action.payload.hideEmpty,
            };
        }
        case TasksActionTypes.SWITCH_MOVE_TASK_MODAL_VISIBLE: {
            return {
                ...state,
                moveTask: {
                    ...state.moveTask,
                    modalVisible: action.payload.visible,
                    taskId: action.payload.taskId,
                },
            };
        }
        case AnnotationActionTypes.CLOSE_JOB: {
            return {
                ...state,
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case TasksActionTypes.GET_TASK_PREVIEW: {
            const { taskID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [taskID]: {
                        preview: '',
                        fetching: true,
                        initialized: false,
                    },
                },
            };
        }
        case TasksActionTypes.GET_TASK_PREVIEW_SUCCESS: {
            const { taskID, preview } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [taskID]: {
                        preview,
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case TasksActionTypes.GET_TASK_PREVIEW_FAILED: {
            const { taskID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [taskID]: {
                        ...previews[taskID],
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        default:
            return state;
    }
};
