import { AnyAction } from 'redux';
import { TasksActionTypes } from '../actions/tasks-actions';

import { TasksState, Task, DumpState } from './interfaces';

const defaultState: TasksState = {
    initialized: false,
    count: 0,
    current: [],
    active: {},
    dumpError: null,
    loadError: null,
    loadDone: '',
    error: null,
    query: {
        page: 1,
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
        mode: null,
    },
};

export default (state = defaultState, action: AnyAction): TasksState => {
    switch (action.type) {
        case TasksActionTypes.GET_TASKS:
            return {
                ...state,
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
                error: null,
                dumpError: null,
                loadError: null,
                loadDone: '',
                query: { ...action.payload.query },
            };
        }
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                current: [],
                count: 0,
                dumpError: null,
                loadError: null,
                loadDone: '',
                error: action.payload.error,
                query: { ...action.payload.query },
            };

        case TasksActionTypes.DUMP_ANNOTATIONS: {
            const { task } = action.payload;
            const { dumper } = action.payload;

            const activeTask = {
                ...state.active[task.id] || {
                    dump: [],
                    load: null,
                },
            };

            if (!activeTask.dump.map(
                (dumpState): string => dumpState.dumperName,
            ).includes(dumper.name)) {
                activeTask.dump = [...activeTask.dump, {
                    dumperName: dumper.name,
                }];
            }

            const activeTasks = { ...state.active };
            activeTasks[task.id] = activeTask;

            return {
                ...state,
                active: activeTasks,
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;
            const { dumper } = action.payload;

            const activeTask = { ...state.active[task.id] };
            const activeDumps = activeTask.dump.filter(
                (dumpState: DumpState): boolean => dumpState.dumperName !== dumper.name,
            );

            activeTask.dump = activeDumps;

            const activeTasks = { ...state.active };
            activeTasks[task.id] = activeTask;

            return {
                ...state,
                active: activeTasks,
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_FAILED: {
            const { task } = action.payload;
            const { dumper } = action.payload;
            const { error } = action.payload;

            const activeTask = { ...state.active[task.id] };
            const activeDumps = activeTask.dump.filter(
                (dumpState: DumpState): boolean => dumpState.dumperName !== dumper.name,
            );

            activeTask.dump = activeDumps;

            const activeTasks = { ...state.active };
            activeTasks[task.id] = activeTask;

            return {
                ...state,
                active: activeTasks,
                dumpError: error,
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS: {
            const { task } = action.payload;
            const { loader } = action.payload;

            const activeTask = {
                ...state.active[task.id] || {
                    dump: [],
                    load: null,
                },
            };

            activeTask.load = {
                loaderName: loader.name,
            };

            const activeTasks = { ...state.active };
            activeTasks[task.id] = activeTask;

            return {
                ...state,
                active: activeTasks,
                loadError: null,
                loadDone: '',
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;

            const activeTasks = state.active;
            delete activeTasks[task.id];

            return {
                ...state,
                active: activeTasks,
                loadError: null,
                loadDone: `Annotations were uploaded for the task #${task.id}`,
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED: {
            const { task } = action.payload;
            const { error } = action.payload;

            const activeTasks = state.active;
            delete activeTasks[task.id];

            return {
                ...state,
                active: activeTasks,
                loadError: error,
                loadDone: '',
            };
        }
        default:
            return state;
    }
};
