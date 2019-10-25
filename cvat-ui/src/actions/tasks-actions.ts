import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { TasksQuery } from '../reducers/interfaces';

import getCore from '../core';

const cvat = getCore();

export enum TasksActionTypes {
    GET_TASKS = 'GET_TASKS',
    GET_TASKS_SUCCESS = 'GET_TASKS_SUCCESS',
    GET_TASKS_FAILED = 'GET_TASKS_FAILED',
    LOAD_ANNOTATIONS = 'LOAD_ANNOTATIONS',
    LOAD_ANNOTATIONS_SUCCESS = 'LOAD_ANNOTATIONS_SUCCESS',
    LOAD_ANNOTATIONS_FAILED = 'LOAD_ANNOTATIONS_FAILED',
    DUMP_ANNOTATIONS = 'DUMP_ANNOTATIONS',
    DUMP_ANNOTATIONS_SUCCESS = 'DUMP_ANNOTATIONS_SUCCESS',
    DUMP_ANNOTATIONS_FAILED = 'DUMP_ANNOTATIONS_FAILED',
}

function getTasks(): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS,
        payload: {},
    };

    return action;
}

function getTasksSuccess(array: any[], previews: string[],
    count: number, query: TasksQuery): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS_SUCCESS,
        payload: {
            previews,
            array,
            count,
            query,
        },
    };

    return action;
}

function getTasksFailed(error: any, query: TasksQuery): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS_FAILED,
        payload: {
            error,
            query,
        },
    };

    return action;
}

export function getTasksAsync(query: TasksQuery):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getTasks());

        // We need remove all keys with null values from query
        const filteredQuery = { ...query };
        for (const key in filteredQuery) {
            if (filteredQuery[key] === null) {
                delete filteredQuery[key];
            }
        }

        let result = null;
        try {
            result = await cvat.tasks.get(filteredQuery);
        } catch (error) {
            dispatch(getTasksFailed(error, query));
            return;
        }

        const array = Array.from(result);
        const previews = [];
        const promises = array
            .map((task): string => (task as any).frames.preview());

        for (const promise of promises) {
            try {
                // a tricky moment
                // await is okay in loop in this case, there aren't any performance bottleneck
                // because all server requests have been already sent in parallel

                // eslint-disable-next-line no-await-in-loop
                previews.push(await promise);
            } catch (error) {
                previews.push('');
            }
        }

        dispatch(getTasksSuccess(array, previews, result.count, query));
    };
}

function dumpAnnotation(task: any, dumper: any): AnyAction {
    const action = {
        type: TasksActionTypes.DUMP_ANNOTATIONS,
        payload: {
            task,
            dumper,
        },
    };

    return action;
}

function dumpAnnotationSuccess(task: any, dumper: any): AnyAction {
    const action = {
        type: TasksActionTypes.DUMP_ANNOTATIONS_SUCCESS,
        payload: {
            task,
            dumper,
        },
    };

    return action;
}

function dumpAnnotationFailed(task: any, dumper: any, error: any): AnyAction {
    const action = {
        type: TasksActionTypes.DUMP_ANNOTATIONS_FAILED,
        payload: {
            task,
            dumper,
            error,
        },
    };

    return action;
}

export function dumpAnnotationsAsync(task: any, dumper: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(dumpAnnotation(task, dumper));
            const url = await task.annotations.dump(task.name, dumper);
            window.location.assign(url);
        } catch (error) {
            dispatch(dumpAnnotationFailed(task, dumper, error));
            return;
        }

        dispatch(dumpAnnotationSuccess(task, dumper));
    };
}

function loadAnnotations(task: any, loader: any): AnyAction {
    const action = {
        type: TasksActionTypes.LOAD_ANNOTATIONS,
        payload: {
            task,
            loader,
        },
    };

    return action;
}

function loadAnnotationsSuccess(task: any): AnyAction {
    const action = {
        type: TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS,
        payload: {
            task,
        },
    };

    return action;
}

function loadAnnotationsFailed(task: any, error: any): AnyAction {
    const action = {
        type: TasksActionTypes.LOAD_ANNOTATIONS_FAILED,
        payload: {
            task,
            error,
        },
    };

    return action;
}

export function loadAnnotationsAsync(task: any, loader: any, file: File):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(loadAnnotations(task, loader));
            await task.annotations.upload(file, loader);
        } catch (error) {
            dispatch(loadAnnotationsFailed(task, error));
            return;
        }

        dispatch(loadAnnotationsSuccess(task));
    };
}
