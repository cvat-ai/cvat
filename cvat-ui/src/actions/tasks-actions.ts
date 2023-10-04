// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { TasksQuery, StorageLocation } from 'reducers';
import {
    getCore, RQStatus, Storage, Task,
} from 'cvat-core-wrapper';
import { filterNull } from 'utils/filter-null';
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
    SWITCH_MOVE_TASK_MODAL_VISIBLE = 'SWITCH_MOVE_TASK_MODAL_VISIBLE',
    GET_TASK_PREVIEW = 'GET_TASK_PREVIEW',
    GET_TASK_PREVIEW_SUCCESS = 'GET_TASK_PREVIEW_SUCCESS',
    GET_TASK_PREVIEW_FAILED = 'GET_TASK_PREVIEW_FAILED',
    UPDATE_TASK_IN_STATE = 'UPDATE_TASK_IN_STATE',
}

function getTasks(query: Partial<TasksQuery>, updateQuery: boolean): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS,
        payload: {
            updateQuery,
            query,
        },
    };

    return action;
}

export function getTasksSuccess(array: any[], count: number): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASKS_SUCCESS,
        payload: {
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

export function getTasksAsync(
    query: Partial<TasksQuery>,
    updateQuery = true,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getTasks(query, updateQuery));

        const filteredQuery = filterNull(query);

        let result = null;
        try {
            result = await cvat.tasks.get(filteredQuery);
        } catch (error) {
            dispatch(getTasksFailed(error));
            return;
        }

        const array = Array.from(result);

        dispatch(getInferenceStatusAsync());
        dispatch(getTasksSuccess(array, result.count));
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

function getTaskPreview(taskID: number): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASK_PREVIEW,
        payload: {
            taskID,
        },
    };

    return action;
}

function getTaskPreviewSuccess(taskID: number, preview: string): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASK_PREVIEW_SUCCESS,
        payload: {
            taskID,
            preview,
        },
    };

    return action;
}

function getTaskPreviewFailed(taskID: number, error: any): AnyAction {
    const action = {
        type: TasksActionTypes.GET_TASK_PREVIEW_FAILED,
        payload: {
            taskID,
            error,
        },
    };

    return action;
}

export function getTaskPreviewAsync(taskInstance: any): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(getTaskPreview(taskInstance.id));
            const result = await taskInstance.frames.preview();
            dispatch(getTaskPreviewSuccess(taskInstance.id, result));
        } catch (error) {
            dispatch(getTaskPreviewFailed(taskInstance.id, error));
        }
    };
}

export function updateTaskInState(task: Task): AnyAction {
    const action = {
        type: TasksActionTypes.UPDATE_TASK_IN_STATE,
        payload: { task },
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
            description.segment_size = +data.advanced.segmentSize;
        }
        if (data.advanced.overlapSize) {
            description.overlap = data.advanced.overlapSize;
        }
        if (data.advanced.startFrame) {
            description.start_frame = +data.advanced.startFrame;
        }
        if (data.advanced.stopFrame) {
            description.stop_frame = +data.advanced.stopFrame;
        }
        if (data.advanced.frameFilter) {
            description.frame_filter = data.advanced.frameFilter;
        }
        if (data.advanced.imageQuality) {
            description.image_quality = +data.advanced.imageQuality;
        }
        if (data.advanced.dataChunkSize) {
            description.data_chunk_size = +data.advanced.dataChunkSize;
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

        try {
            const savedTask = await taskInstance.save((status: RQStatus, progress: number, message: string): void => {
                if (status === RQStatus.UNKNOWN) {
                    onProgress?.(`${message} ${progress ? `${Math.floor(progress * 100)}%` : ''}`);
                } else if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                    const helperMessage = 'You may close the window.';
                    onProgress?.(`${message} ${progress ? `${Math.floor(progress * 100)}%` : ''}. ${helperMessage}`);
                } else {
                    onProgress?.(`${status}: ${message}`);
                }
            });
            dispatch(updateTaskInState(savedTask));
            dispatch(getTaskPreviewAsync(savedTask));
            return savedTask;
        } catch (error) {
            dispatch(createTaskFailed(error));
            throw error;
        }
    };
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
