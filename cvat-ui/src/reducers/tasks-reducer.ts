// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { omit } from 'lodash';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { TasksActionTypes } from 'actions/tasks-actions';
import { AuthActionTypes } from 'actions/auth-actions';

import { AnnotationActionTypes } from 'actions/annotation-actions';
import { TasksState, Task } from '.';

const defaultState: TasksState = {
    initialized: false,
    fetching: false,
    updating: false,
    hideEmpty: false,
    moveTask: {
        modalVisible: false,
        taskId: null,
    },
    count: 0,
    current: [],
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
        jobUpdates: {},
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
                gettingQuery: action.payload.updateQuery ? { ...action.payload.query } : state.gettingQuery,
            };
        case TasksActionTypes.GET_TASKS_SUCCESS: {
            const combinedWithPreviews = action.payload.array.map(
                (task: any, index: number): Task => ({
                    instance: task,
                    preview: action.payload.previews[index],
                }),
            );

            return {
                ...state,
                initialized: true,
                fetching: false,
                updating: false,
                count: action.payload.count,
                current: combinedWithPreviews,
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
        case TasksActionTypes.UPDATE_TASK: {
            return {
                ...state,
                updating: true,
            };
        }
        case TasksActionTypes.UPDATE_TASK_SUCCESS: {
            // a task will be undefined after updating when a user doesn't have access to the task anymore
            const { task, taskID } = action.payload;

            if (typeof task === 'undefined') {
                return {
                    ...state,
                    updating: false,
                    current: state.current.filter((_task: Task): boolean => _task.instance.id !== taskID),
                };
            }

            return {
                ...state,
                updating: false,
                current: state.current.map(
                    (_task): Task => {
                        if (_task.instance.id === task.id) {
                            return {
                                ..._task,
                                instance: task,
                            };
                        }

                        return _task;
                    },
                ),
            };
        }
        case TasksActionTypes.UPDATE_TASK_FAILED: {
            return {
                ...state,
                updating: false,
                current: state.current.map(
                    (task): Task => {
                        if (task.instance.id === action.payload.task.id) {
                            return {
                                ...task,
                                instance: action.payload.task,
                            };
                        }

                        return task;
                    },
                ),
            };
        }
        case TasksActionTypes.UPDATE_JOB: {
            const { jobID } = action.payload;
            const { jobUpdates } = state.activities;

            return {
                ...state,
                updating: true,
                activities: {
                    ...state.activities,
                    jobUpdates: {
                        ...jobUpdates,
                        ...Object.fromEntries([[jobID, true]]),
                    },
                },
            };
        }
        case TasksActionTypes.UPDATE_JOB_SUCCESS:
        case TasksActionTypes.UPDATE_JOB_FAILED: {
            const { jobID } = action.payload;
            const { jobUpdates } = state.activities;

            delete jobUpdates[jobID];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    jobUpdates: omit(jobUpdates, [jobID]),
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
                updating: false,
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
