import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const core = getCore();

export enum TaskActionTypes {
    GET_TASK = 'GET_TASK',
    GET_TASK_SUCCESS = 'GET_TASK_SUCCESS',
    GET_TASK_FAILED = 'GET_TASK_FAILED',
    UPDATE_TASK = 'UPDATE_TASK',
    UPDATE_TASK_SUCCESS = 'UPDATE_TASK_SUCCESS',
    UPDATE_TASK_FAILED = 'UPDATE_TASK_FAILED',
}

function getTask(): AnyAction {
    const action = {
        type: TaskActionTypes.GET_TASK,
        payload: {},
    };

    return action;
}

function getTaskSuccess(taskInstance: any, previewImage: string): AnyAction {
    const action = {
        type: TaskActionTypes.GET_TASK_SUCCESS,
        payload: {
            taskInstance,
            previewImage,
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

function updateTask(): AnyAction {
    const action = {
        type: TaskActionTypes.UPDATE_TASK,
        payload: {},
    };

    return action;
}

function updateTaskSuccess(taskInstance: any): AnyAction {
    const action = {
        type: TaskActionTypes.UPDATE_TASK_SUCCESS,
        payload: {
            taskInstance,
        },
    };

    return action;
}

function updateTaskFailed(error: any, taskInstance: any): AnyAction {
    const action = {
        type: TaskActionTypes.UPDATE_TASK_FAILED,
        payload: {
            error,
            taskInstance,
        },
    };

    return action;
}

export function updateTaskAsync(taskInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(updateTask());
            await taskInstance.save();
            const [task] = await core.tasks.get({ id: taskInstance.id });
            dispatch(updateTaskSuccess(task));
        } catch (error) {
            // try abort all changes
            let task = null;
            try {
                [task] = await core.tasks.get({ id: taskInstance.id });
            } catch (fetchError) {
                dispatch(updateTaskFailed(error, taskInstance));
                return;
            }

            dispatch(updateTaskFailed(error, task));
        }
    };
}

// a job is a part of a task, so for simplify we consider
// updating the job as updating a task
export function updateJobAsync(jobInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(updateTask());
            await jobInstance.save();
            const [task] = await core.tasks.get({ id: jobInstance.task.id });
            dispatch(updateTaskSuccess(task));
        } catch (error) {
            // try abort all changes
            let task = null;
            try {
                [task] = await core.tasks.get({ id: jobInstance.task.id });
            } catch (fetchError) {
                dispatch(updateTaskFailed(error, jobInstance.task));
                return;
            }

            dispatch(updateTaskFailed(error, task));
        }
    };
}
