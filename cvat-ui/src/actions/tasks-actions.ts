import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { TasksQuery } from '../reducers/interfaces';

import getCore from '../core';

const cvat = getCore();

export enum TasksActionTypes {
    GET_TASKS_SUCCESS = 'GET_TASKS_SUCCESS',
    GET_TASKS_FAILED = 'GET_TASKS_FAILED',
}

export function getTasksSuccess(array: any[], previews: string[],
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

export function getTasksFailed(error: any, query: TasksQuery): AnyAction {
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
