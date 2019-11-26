import { AnyAction } from 'redux';
import { TasksActionTypes } from '../actions/tasks-actions';

import { TasksState, Task } from './interfaces';

const defaultState: TasksState = {
    initialized: false,
    tasksFetchingError: null,
    taskUpdatingError: null,
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
    },
    activities: {
        dumps: {
            dumpingError: null,
            byTask: {},
        },
        loads: {
            loadingError: null,
            loadingDoneMessage: '',
            byTask: {},
        },
        deletes: {
            deletingError: null,
            byTask: {},
        },
        creates: {
            creatingError: null,
            status: '',
        },
    },
};

export default (inputState: TasksState = defaultState, action: AnyAction): TasksState => {
    function cleanupTemporaryInfo(stateToResetErrors: TasksState): TasksState {
        return {
            ...stateToResetErrors,
            tasksFetchingError: null,
            taskUpdatingError: null,
            activities: {
                ...stateToResetErrors.activities,
                dumps: {
                    ...stateToResetErrors.activities.dumps,
                    dumpingError: null,
                },
                loads: {
                    ...stateToResetErrors.activities.loads,
                    loadingError: null,
                    loadingDoneMessage: '',
                },
                deletes: {
                    ...stateToResetErrors.activities.deletes,
                    deletingError: null,
                },
            },
        };
    }

    const state = cleanupTemporaryInfo(inputState);

    switch (action.type) {
        case TasksActionTypes.GET_TASKS:
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        deletingError: null,
                        byTask: {},
                    },
                },
                initialized: false,
            };
        case TasksActionTypes.GET_TASKS_SUCCESS: {
            const combinedWithPreviews = action.payload.array
                .map((task: any, index: number): Task => ({
                    instance: task,
                    preview: action.payload.previews[index],
                }));

            return {
                ...state,
                initialized: true,
                count: action.payload.count,
                current: combinedWithPreviews,
                gettingQuery: { ...action.payload.query },
            };
        }
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                count: 0,
                current: [],
                gettingQuery: { ...action.payload.query },
                tasksFetchingError: action.payload.error,
            };
        case TasksActionTypes.DUMP_ANNOTATIONS: {
            const { task } = action.payload;
            const { dumper } = action.payload;

            const tasksDumpingActivities = {
                ...state.activities.dumps,
            };

            const theTaskDumpingActivities = [...tasksDumpingActivities.byTask[task.id] || []];
            if (!theTaskDumpingActivities.includes(dumper.name)) {
                theTaskDumpingActivities.push(dumper.name);
            } else {
                throw Error('Dump with the same dumper for this same task has been already started');
            }
            tasksDumpingActivities.byTask[task.id] = theTaskDumpingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    dumps: tasksDumpingActivities,
                },
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;
            const { dumper } = action.payload;

            const tasksDumpingActivities = {
                ...state.activities.dumps,
            };

            const theTaskDumpingActivities = tasksDumpingActivities.byTask[task.id]
                .filter((dumperName: string): boolean => dumperName !== dumper.name);

            tasksDumpingActivities.byTask[task.id] = theTaskDumpingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    dumps: tasksDumpingActivities,
                },
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_FAILED: {
            const { task } = action.payload;
            const { dumper } = action.payload;
            const dumpingError = action.payload.error;

            const tasksDumpingActivities = {
                ...state.activities.dumps,
                dumpingError,
            };

            const theTaskDumpingActivities = tasksDumpingActivities.byTask[task.id]
                .filter((dumperName: string): boolean => dumperName !== dumper.name);

            tasksDumpingActivities.byTask[task.id] = theTaskDumpingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    dumps: tasksDumpingActivities,
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS: {
            const { task } = action.payload;
            const { loader } = action.payload;

            const tasksLoadingActivity = {
                ...state.activities.loads,
            };

            if (task.id in tasksLoadingActivity.byTask) {
                throw Error('Load for this task has been already started');
            }

            tasksLoadingActivity.byTask[task.id] = loader.name;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: tasksLoadingActivity,
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;

            const tasksLoadingActivity = {
                ...state.activities.loads,
            };

            delete tasksLoadingActivity.byTask[task.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...tasksLoadingActivity,
                        loadingDoneMessage: `Annotations have been loaded to the task ${task.id}`,
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED: {
            const { task } = action.payload;
            const loadingError = action.payload.error;

            const tasksLoadingActivity = {
                ...state.activities.loads,
            };

            delete tasksLoadingActivity.byTask[task.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...tasksLoadingActivity,
                        loadingError,
                    },
                },
            };
        }
        case TasksActionTypes.DELETE_TASK: {
            const { taskID } = action.payload;

            const deletesActivities = state.activities.deletes;

            const activities = { ...state.activities };
            activities.deletes = { ...activities.deletes };

            activities.deletes.byTask[taskID] = false;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: deletesActivities,
                },
            };
        }
        case TasksActionTypes.DELETE_TASK_SUCCESS: {
            const { taskID } = action.payload;

            const deletesActivities = state.activities.deletes;

            const activities = { ...state.activities };
            activities.deletes = { ...activities.deletes };

            activities.deletes.byTask[taskID] = true;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: deletesActivities,
                },
            };
        }
        case TasksActionTypes.DELETE_TASK_FAILED: {
            const { taskID } = action.payload;
            const { error } = action.payload;

            const deletesActivities = state.activities.deletes;

            const activities = { ...state.activities };
            activities.deletes = { ...activities.deletes };

            delete activities.deletes.byTask[taskID];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletesActivities,
                        deletingError: error,
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        creatingError: null,
                        status: '',
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
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        status: 'CREATED',
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK_FAILED: {
            const { error } = action.payload;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        creatingError: error,
                    },
                },
            };
        }
        case TasksActionTypes.UPDATE_TASK: {
            return {
                ...state,
                taskUpdatingError: null,
            };
        }
        case TasksActionTypes.UPDATE_TASK_SUCCESS: {
            return {
                ...state,
                current: state.current.map((task): Task => {
                    if (task.instance.id === action.payload.taskInstance.id) {
                        return {
                            ...task,
                            instance: action.payload.taskInstance,
                        };
                    }

                    return task;
                }),
            };
        }
        case TasksActionTypes.UPDATE_TASK_FAILED: {
            return {
                ...state,
                taskUpdatingError: action.payload.error,
                current: state.current.map((task): Task => {
                    if (task.instance.id === action.payload.taskInstance.id) {
                        return {
                            ...task,
                            instance: action.payload.taskInstance,
                        };
                    }

                    return task;
                }),
            };
        }
        default:
            return state;
    }
};
