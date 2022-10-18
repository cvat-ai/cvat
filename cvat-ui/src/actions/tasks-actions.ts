// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import {
    TasksQuery, CombinedState, Indexable, StorageLocation,
} from 'reducers';
import { getCore, Storage } from 'cvat-core-wrapper';
import { getInferenceStatusAsync } from './models-actions';

const cvat = getCore();

export enum TasksActionTypes {
    GET_TASKS = 'GET_TASKS',
    GET_TASKS_SUCCESS = 'GET_TASKS_SUCCESS',
    GET_TASKS_FAILED = 'GET_TASKS_FAILED',
    DELETE_TASK = 'DELETE_TASK',
    DELETE_TASK_SUCCESS = 'DELETE_TASK_SUCCESS',
    DELETE_TASK_FAILED = 'DELETE_TASK_FAILED',
    CREATE_TASK_FAILED = 'CREATE_TASK_FAILED',
    UPDATE_TASK = 'UPDATE_TASK',
    UPDATE_TASK_SUCCESS = 'UPDATE_TASK_SUCCESS',
    UPDATE_TASK_FAILED = 'UPDATE_TASK_FAILED',
    UPDATE_JOB = 'UPDATE_JOB',
    UPDATE_JOB_SUCCESS = 'UPDATE_JOB_SUCCESS',
    UPDATE_JOB_FAILED = 'UPDATE_JOB_FAILED',
    HIDE_EMPTY_TASKS = 'HIDE_EMPTY_TASKS',
    SWITCH_MOVE_TASK_MODAL_VISIBLE = 'SWITCH_MOVE_TASK_MODAL_VISIBLE',
}

function getTasks(query: TasksQuery, updateQuery: boolean): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS,
        payload: {
            updateQuery,
            query,
        },
    };

    return action;
}

export function getTasksSuccess(array: any[], previews: string[], count: number): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS_SUCCESS,
        payload: {
            previews,
            array,
            count,
        },
    };

    return action;
}

function getTasksFailed(error: any): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS_FAILED,
        payload: { error },
    };

    return action;
}

export function getTasksAsync(query: TasksQuery, updateQuery = true): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getTasks(query, updateQuery));

        // We remove all keys with null values from the query
        const filteredQuery = { ...query };
        for (const key of Object.keys(query)) {
            if ((filteredQuery as Indexable)[key] === null) {
                delete (filteredQuery as Indexable)[key];
            }
        }

        let result = null;
        try {
            result = await cvat.tasks.get(filteredQuery);
        } catch (error) {
            dispatch(getTasksFailed(error));
            return;
        }

        const array = Array.from(result);
        const promises = array.map((task): string => (task as any).frames.preview().catch(() => ''));

        dispatch(getInferenceStatusAsync());
        dispatch(getTasksSuccess(array, await Promise.all(promises), result.count));
    };
}

function deleteTask(taskID: number): AnyAction {
    const action = {
        type: TasksActionTypes.DELETE_TASK,
        payload: {
            taskID,
        },
    };

    return action;
}

function deleteTaskSuccess(taskID: number): AnyAction {
    const action = {
        type: TasksActionTypes.DELETE_TASK_SUCCESS,
        payload: {
            taskID,
        },
    };

    return action;
}

function deleteTaskFailed(taskID: number, error: any): AnyAction {
    const action = {
        type: TasksActionTypes.DELETE_TASK_FAILED,
        payload: {
            taskID,
            error,
        },
    };

    return action;
}

export function deleteTaskAsync(taskInstance: any): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(deleteTask(taskInstance.id));
            await taskInstance.delete();
        } catch (error) {
            dispatch(deleteTaskFailed(taskInstance.id, error));
            return;
        }

        dispatch(deleteTaskSuccess(taskInstance.id));
    };
}

function createTaskFailed(error: any): AnyAction {
    const action = {
        type: TasksActionTypes.CREATE_TASK_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function createTaskAsync(data: any, onProgress?: (status: string) => void):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch): Promise<any> => {
        const description: any = {
            name: data.basic.name,
            labels: data.labels,
            image_quality: 70,
            use_zip_chunks: data.advanced.useZipChunks,
            use_cache: data.advanced.useCache,
            sorting_method: data.advanced.sortingMethod,
            source_storage: new Storage(data.advanced.sourceStorage || { location: StorageLocation.LOCAL }).toJSON(),
            target_storage: new Storage(data.advanced.targetStorage || { location: StorageLocation.LOCAL }).toJSON(),
        };

        if (data.projectId) {
            description.project_id = data.projectId;
        }
        if (data.advanced.bugTracker) {
            description.bug_tracker = data.advanced.bugTracker;
        }
        if (data.advanced.segmentSize) {
            description.segment_size = data.advanced.segmentSize;
        }
        if (data.advanced.overlapSize) {
            description.overlap = data.advanced.overlapSize;
        }
        if (data.advanced.startFrame) {
            description.start_frame = data.advanced.startFrame;
        }
        if (data.advanced.stopFrame) {
            description.stop_frame = data.advanced.stopFrame;
        }
        if (data.advanced.frameFilter) {
            description.frame_filter = data.advanced.frameFilter;
        }
        if (data.advanced.imageQuality) {
            description.image_quality = data.advanced.imageQuality;
        }
        if (data.advanced.dataChunkSize) {
            description.data_chunk_size = data.advanced.dataChunkSize;
        }
        if (data.advanced.copyData) {
            description.copy_data = data.advanced.copyData;
        }
        if (data.subset) {
            description.subset = data.subset;
        }
        if (data.cloudStorageId) {
            description.cloud_storage_id = data.cloudStorageId;
        }

        const taskInstance = new cvat.classes.Task(description);
        taskInstance.clientFiles = data.files.local;
        taskInstance.serverFiles = data.files.share.concat(data.files.cloudStorage);
        taskInstance.remoteFiles = data.files.remote;

        if (data.advanced.repository) {
            const [gitPlugin] = (await cvat.plugins.list()).filter((plugin: any): boolean => plugin.name === 'Git');

            if (gitPlugin) {
                gitPlugin.callbacks.onStatusChange = (status: string): void => {
                    onProgress?.(status);
                };
                gitPlugin.data.task = taskInstance;
                gitPlugin.data.repos = data.advanced.repository;
                gitPlugin.data.format = data.advanced.format;
                gitPlugin.data.lfs = data.advanced.lfs;
            }
        }

        try {
            const savedTask = await taskInstance.save((status: string, progress: number): void => {
                onProgress?.(status + (progress !== null ? ` ${Math.floor(progress * 100)}%` : ''));
            });
            return savedTask;
        } catch (error) {
            dispatch(createTaskFailed(error));
            throw error;
        }
    };
}

function updateTask(): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_TASK,
        payload: {},
    };

    return action;
}

export function updateTaskSuccess(task: any, taskID: number): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_TASK_SUCCESS,
        payload: { task, taskID },
    };

    return action;
}

function updateTaskFailed(error: any, task: any): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_TASK_FAILED,
        payload: { error, task },
    };

    return action;
}

function updateJob(jobID: number): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_JOB,
        payload: { jobID },
    };

    return action;
}

function updateJobSuccess(jobInstance: any, jobID: number): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_JOB_SUCCESS,
        payload: { jobID, jobInstance },
    };

    return action;
}

function updateJobFailed(jobID: number, error: any): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_JOB_FAILED,
        payload: { jobID, error },
    };

    return action;
}

export function updateTaskAsync(taskInstance: any): ThunkAction<Promise<void>, CombinedState, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(updateTask());
            const task = await taskInstance.save();
            dispatch(updateTaskSuccess(task, taskInstance.id));
        } catch (error) {
            // try abort all changes
            let task = null;
            try {
                [task] = await cvat.tasks.get({ id: taskInstance.id });
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
export function updateJobAsync(jobInstance: any): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(updateJob(jobInstance.id));
            const newJob = await jobInstance.save();
            dispatch(updateJobSuccess(newJob, newJob.id));
        } catch (error) {
            dispatch(updateJobFailed(jobInstance.id, error));
        }
    };
}

export function hideEmptyTasks(hideEmpty: boolean): AnyAction {
    const action = {
        type: TasksActionTypes.HIDE_EMPTY_TASKS,
        payload: {
            hideEmpty,
        },
    };

    return action;
}

export function switchMoveTaskModalVisible(visible: boolean, taskId: number | null = null): AnyAction {
    const action = {
        type: TasksActionTypes.SWITCH_MOVE_TASK_MODAL_VISIBLE,
        payload: {
            taskId,
            visible,
        },
    };

    return action;
}

interface LabelMap {
    label_id: number;
    new_label_name: string | null;
    clear_attributes: boolean;
}

export function moveTaskToProjectAsync(
    taskInstance: any,
    projectId: any,
    labelMap: LabelMap[],
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(updateTask());
        try {
            // eslint-disable-next-line no-param-reassign
            taskInstance.labels = labelMap.map((mapper) => {
                const [label] = taskInstance.labels.filter((_label: any) => mapper.label_id === _label.id);
                label.name = mapper.new_label_name;
                return label;
            });
            // eslint-disable-next-line no-param-reassign
            taskInstance.projectId = projectId;
            await taskInstance.save();
            const [task] = await cvat.tasks.get({ id: taskInstance.id });
            dispatch(updateTaskSuccess(task, task.id));
        } catch (error) {
            dispatch(updateTaskFailed(error, taskInstance));
        }
    };
}
