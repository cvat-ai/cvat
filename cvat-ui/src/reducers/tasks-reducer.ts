// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { omit } from 'lodash';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { TasksActionTypes } from 'actions/tasks-actions';
import { AuthActionTypes } from 'actions/auth-actions';

import { TasksState, Task } from './interfaces';

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
        owner: null,
        assignee: null,
        name: null,
        status: null,
        mode: null,
        projectId: null,
    },
    activities: {
        loads: {},
        deletes: {},
        creates: {
            taskId: null,
            status: '',
            error: '',
        },
        backups: {},
    },
    importing: false,
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
                current: [],
                gettingQuery: { ...action.payload.query },
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
        case TasksActionTypes.LOAD_ANNOTATIONS: {
            const { task } = action.payload;
            const { loader } = action.payload;
            const { loads } = state.activities;

            loads[task.id] = task.id in loads ? loads[task.id] : loader.name;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED:
        case TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;
            const { loads } = state.activities;

            delete loads[task.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
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
        case TasksActionTypes.EXPORT_TASK: {
            const { taskID } = action.payload;
            const { backups } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    backups: {
                        ...backups,
                        ...Object.fromEntries([[taskID, true]]),
                    },
                },
            };
        }
        case TasksActionTypes.EXPORT_TASK_FAILED:
        case TasksActionTypes.EXPORT_TASK_SUCCESS: {
            const { taskID } = action.payload;
            const { backups } = state.activities;

            delete backups[taskID];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    backups: omit(backups, [taskID]),
                },
            };
        }
        case TasksActionTypes.IMPORT_TASK: {
            return {
                ...state,
                importing: true,
            };
        }
        case TasksActionTypes.IMPORT_TASK_FAILED:
        case TasksActionTypes.IMPORT_TASK_SUCCESS: {
            return {
                ...state,
                importing: false,
            };
        }
        case TasksActionTypes.CREATE_TASK: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        taskId: null,
                        status: '',
                        error: '',
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK_STATUS_UPDATED: {
            const { status } = action.payload;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        status,
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK_SUCCESS: {
            const { taskId } = action.payload;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        taskId,
                        status: 'CREATED',
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK_FAILED: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        status: 'FAILED',
                        error: action.payload.error.toString(),
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
            return {
                ...state,
                updating: true,
            };
        }
        case TasksActionTypes.UPDATE_JOB_SUCCESS: {
            const { jobInstance } = action.payload;
            const idx = state.current.findIndex((task: Task) => task.instance.id === jobInstance.taskId);
            const newCurrent = idx === -1 ?
                state.current : [...(state.current.splice(idx, 1), state.current)];

            return {
                ...state,
                current: newCurrent,
                gettingQuery: state.gettingQuery.id === jobInstance.taskId ? {
                    ...state.gettingQuery,
                    id: null,
                } : state.gettingQuery,
                updating: false,
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
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
};
