// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';
import { CloudStoragesQuery } from 'reducers/interfaces';

const cvat = getCore();

export enum CloudStorageActionsTypes {
    // GET_FILE = 'GET_FILE',
    // GET_FILE_SUCCESS = 'GET_FILES_SUCCESS',
    // GET_FILE_FAILED = 'GET_FILE_FAILED',
    GET_CLOUD_STORAGES = 'GET_CLOUD_STORAGES',
    GET_CLOUD_STORAGE_SUCCESS = 'GET_CLOUD_STORAGES_SUCCESS',
    GET_CLOUD_STORAGE_FAILED = 'GET_CLOUD_STORAGES_FAILED',
    CREATE_CLOUD_STORAGE = 'CREATE_CLOUD_STORAGE',
    CREATE_CLOUD_STORAGE_SUCCESS = 'CREATE_CLOUD_STORAGE_SUCCESS',
    CREATE_CLOUD_STORAGE_FAILED = 'CREATE_CLOUD_STORAGE_FAILED',
    DELETE_CLOUD_STORAGE = 'DELETE_CLOUD_STORAGE',
    DELETE_CLOUD_STORAGE_SUCCESS = 'DELETE_CLOUD_STORAGE_SUCCESS',
    DELETE_CLOUD_STORAGE_FAILED = 'DELETE_CLOUD_STORAGE_FAILED',
    UPDATE_CLOUD_STORAGE = 'UPDATE_CLOUD_STORAGE',
    UPDATE_CLOUD_STORAGE_SUCCESS = 'UPDATE_CLOUD_STORAGE_SUCCESS',
    UPDATE_CLOUD_STORAGE_FAILED = 'UPDATE_CLOUD_STORAGE_FAILED',
    LOAD_CLOUD_STORAGE_CONTENT = 'LOAD_CLOUD_STORAGE_CONTENT',
    LOAD_CLOUD_STORAGE_CONTENT_FAILED = 'LOAD_CLOUD_STORAGE_CONTENT_FAILED',
    LOAD_CLOUD_STORAGE_CONTENT_SUCCESS = 'LOAD_CLOUD_STORAGE_CONTENT_SUCCESS',
}

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCloudStorages(): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.GET_CLOUD_STORAGES,
        payload: {},
    };

    return action;
}

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCloudStoragesSuccess(
    array: any[],
    previews: string[],
    count: number,
    query: CloudStoragesQuery,
): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.GET_CLOUD_STORAGE_SUCCESS,
        payload: {
            previews,
            array,
            count,
            query,
        },
    };

    return action;
}

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCloudStoragesFailed(error: any, query: CloudStoragesQuery): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.GET_CLOUD_STORAGE_FAILED,
        payload: {
            error,
            query,
        },
    };

    return action;
}

export function getCloudStoragesAsync(query: CloudStoragesQuery): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getCloudStorages());

        // We need remove all keys with null values from query
        const filteredQuery = { ...query };
        for (const key in filteredQuery) {
            if (filteredQuery[key] === null) {
                delete filteredQuery[key];
            }
        }

        let result = null;
        try {
            result = await cvat.cloudStorages.get(filteredQuery);
        } catch (error) {
            dispatch(getCloudStoragesFailed(error, query));
            return;
        }

        const array = Array.from(result);
        //         const promises = array.map((cloudStorage: CloudStorage):
        // string => (cloudStorage as any).frames.preview().catch(() => ''));

        dispatch(
            getCloudStoragesSuccess(
                array,
                array.map((): string => ''),
                result.count,
                query,
            ),
        );
    };
}

function deleteCloudStorage(cloudStorageID: number): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.DELETE_CLOUD_STORAGE,
        payload: {
            cloudStorageID,
        },
    };

    return action;
}

function deleteCloudStorageSuccess(cloudStorageID: number): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.DELETE_CLOUD_STORAGE_SUCCESS,
        payload: {
            cloudStorageID,
        },
    };

    return action;
}

function deleteCloudStorageFailed(cloudStorageID: number, error: any): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.DELETE_CLOUD_STORAGE_FAILED,
        payload: {
            cloudStorageID,
            error,
        },
    };

    return action;
}

export function deleteCloudStorageAsync(cloudStorageInstance: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(deleteCloudStorage(cloudStorageInstance.id));
            await cloudStorageInstance.delete();
        } catch (error) {
            dispatch(deleteCloudStorageFailed(cloudStorageInstance.id, error));
            return;
        }

        dispatch(deleteCloudStorageSuccess(cloudStorageInstance.id));
    };
}

function createCloudStorage(): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.CREATE_CLOUD_STORAGE,
        payload: {},
    };

    return action;
}

function createCloudStorageSuccess(cloudStorageId: number): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.CREATE_CLOUD_STORAGE_SUCCESS,
        payload: {
            cloudStorageId,
        },
    };

    return action;
}

function createCloudStorageFailed(error: any): AnyAction {
    const action = {
        type: CloudStorageActionsTypes.CREATE_CLOUD_STORAGE_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function createCloudStorageAsync(data: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const cloudStorageInstance = new cvat.classes.CloudStorage(data);

        dispatch(createCloudStorage());
        try {
            const savedCloudStorage = await cloudStorageInstance.save();
            dispatch(createCloudStorageSuccess(savedCloudStorage.id));
        } catch (error) {
            dispatch(createCloudStorageFailed(error));
        }
    };
}
