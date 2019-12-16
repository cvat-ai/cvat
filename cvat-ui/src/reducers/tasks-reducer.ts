import { AnyAction } from 'redux';
import { TasksActionTypes } from '../actions/tasks-actions';
import { AuthActionTypes } from '../actions/auth-actions';

import { TasksState, Task } from './interfaces';

const defaultState: TasksState = {
    initialized: false,
    fetching: false,
    hideEmpty: false,
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
            byTask: {},
        },
        exports: {
            byTask: {},
        },
        loads: {
            byTask: {},
        },
        deletes: {
            byTask: {},
        },
        creates: {
            status: '',
        },
    },
};

export default (state: TasksState = defaultState, action: AnyAction): TasksState => {
    switch (action.type) {
        case TasksActionTypes.GET_TASKS:
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        byTask: {},
                    },
                },
                initialized: false,
                fetching: true,
                hideEmpty: true,
                count: 0,
                current: [],
                gettingQuery: { ...action.payload.query },
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
                fetching: false,
                count: action.payload.count,
                current: combinedWithPreviews,
                gettingQuery: { ...action.payload.query },
            };
        }
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
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
        case TasksActionTypes.EXPORT_DATASET: {
            const { task } = action.payload;
            const { exporter } = action.payload;

            const tasksExportingActivities = {
                ...state.activities.exports,
            };

            const theTaskDumpingActivities = [...tasksExportingActivities.byTask[task.id] || []];
            if (!theTaskDumpingActivities.includes(exporter.name)) {
                theTaskDumpingActivities.push(exporter.name);
            }
            tasksExportingActivities.byTask[task.id] = theTaskDumpingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    exports: tasksExportingActivities,
                },
            };
        }
        case TasksActionTypes.EXPORT_DATASET_SUCCESS: {
            const { task } = action.payload;
            const { exporter } = action.payload;

            const tasksExportingActivities = {
                ...state.activities.exports,
            };

            const theTaskExportingActivities = tasksExportingActivities.byTask[task.id]
                .filter((exporterName: string): boolean => exporterName !== exporter.name);

            tasksExportingActivities.byTask[task.id] = theTaskExportingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    exports: tasksExportingActivities,
                },
            };
        }
        case TasksActionTypes.EXPORT_DATASET_FAILED: {
            const { task } = action.payload;
            const { exporter } = action.payload;

            const tasksExportingActivities = {
                ...state.activities.exports,
            };

            const theTaskExportingActivities = tasksExportingActivities.byTask[task.id]
                .filter((exporterName: string): boolean => exporterName !== exporter.name);

            tasksExportingActivities.byTask[task.id] = theTaskExportingActivities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    exports: tasksExportingActivities,
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
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED: {
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
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        status: 'FAILED',
                    },
                },
            };
        }
        case TasksActionTypes.UPDATE_TASK: {
            return {
                ...state,
            };
        }
        case TasksActionTypes.UPDATE_TASK_SUCCESS: {
            return {
                ...state,
                current: state.current.map((task): Task => {
                    if (task.instance.id === action.payload.task.id) {
                        return {
                            ...task,
                            instance: action.payload.task,
                        };
                    }

                    return task;
                }),
            };
        }
        case TasksActionTypes.UPDATE_TASK_FAILED: {
            return {
                ...state,
                current: state.current.map((task): Task => {
                    if (task.instance.id === action.payload.task.id) {
                        return {
                            ...task,
                            instance: action.payload.task,
                        };
                    }

                    return task;
                }),
            };
        }
        case TasksActionTypes.HIDE_EMPTY_TASKS: {
            return {
                ...state,
                hideEmpty: action.payload.hideEmpty,
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default:
            return state;
    }
};
