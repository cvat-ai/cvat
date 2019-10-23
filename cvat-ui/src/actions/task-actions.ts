import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const core = getCore();

export enum TaskActionTypes {
    GET_TASK = 'GET_TASK',
    GET_TASK_SUCCESS = 'GET_TASK_SUCCESS',
    GET_TASK_FAILED = 'GET_TASK_FAILED',
}

function getTask(): AnyAction {
    const action = {
        type: TaskActionTypes.GET_TASK,
        payload: {},
    };

    return action;
}

function getTaskSuccess(taskInstance: any, taskPreview: string): AnyAction {
    const action = {
        type: TaskActionTypes.GET_TASK_SUCCESS,
        payload: {
            taskInstance,
            taskPreview,
        },
    };

    return action;
}

function getTaskFailed(error: any): AnyAction {
    const action = {
        type: TaskActionTypes.GET_TASK_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function getTaskAsync(tid: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(getTask());
            const taskInstance = (await core.tasks.get({ id: tid }))[0];
            if (taskInstance) {
                const previewImage = await taskInstance.frames.preview();
                dispatch(getTaskSuccess(taskInstance, previewImage));
            } else {
                throw Error(`Task ${tid} wasn't found on the server`);
            }
        } catch (error) {
            dispatch(getTaskFailed(error));
        }
    };
}
