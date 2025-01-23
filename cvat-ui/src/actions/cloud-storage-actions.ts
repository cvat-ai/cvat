// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { CloudStoragesQuery, CloudStorage } from 'reducers';
import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum CloudStorageActionTypes {
    UPDATE_CLOUD_STORAGES_GETTING_QUERY = 'UPDATE_CLOUD_STORAGES_GETTING_QUERY',
    GET_CLOUD_STORAGES = 'GET_CLOUD_STORAGES',
    GET_CLOUD_STORAGE_SUCCESS = 'GET_CLOUD_STORAGES_SUCCESS',
    GET_CLOUD_STORAGE_FAILED = 'GET_CLOUD_STORAGES_FAILED',
    GET_CLOUD_STORAGE_STATUS = 'GET_CLOUD_STORAGE_STATUS',
    GET_CLOUD_STORAGE_STATUS_SUCCESS = 'GET_CLOUD_STORAGE_STATUS_SUCCESS',
    GET_CLOUD_STORAGE_STATUS_FAILED = 'GET_CLOUD_STORAGE_STATUS_FAILED',
    GET_CLOUD_STORAGE_PREVIEW = 'GET_CLOUD_STORAGE_PREVIEW',
    GET_CLOUD_STORAGE_PREVIEW_SUCCESS = 'GET_CLOUD_STORAGE_PREVIEW_SUCCESS',
    GET_CLOUD_STORAGE_PREVIEW_FAILED = 'GET_CLOUD_STORAGE_PREVIEW_FAILED',
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

const cloudStoragesActions = {
    updateCloudStoragesGettingQuery: (query: Partial<CloudStoragesQuery>) => (
        createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGES_GETTING_QUERY, { query })
    ),
    getCloudStorages: () => createAction(CloudStorageActionTypes.GET_CLOUD_STORAGES),
    getCloudStoragesSuccess: (
        array: any[],
        count: number,
        query: Partial<CloudStoragesQuery>,
    ) => createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_SUCCESS, {
        array,
        count,
        query,
    }),
    getCloudStoragesFailed: (error: any, query: Partial<CloudStoragesQuery>) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_FAILED, { error, query })
    ),
    deleteCloudStorage: (cloudStorageID: number) => (
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE, { cloudStorageID })
    ),
    deleteCloudStorageSuccess: (cloudStorageID: number) => (
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE_SUCCESS, { cloudStorageID })
    ),
    deleteCloudStorageFailed: (error: any, cloudStorageID: number) => (
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE_FAILED, { error, cloudStorageID })
    ),
    createCloudStorage: () => createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE),
    createCloudStorageSuccess: (cloudStorageID: number) => (
        createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE_SUCCESS, { cloudStorageID })
    ),
    createCloudStorageFailed: (error: any) => (
        createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE_FAILED, { error })
    ),
    updateCloudStorage: () => createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE, {}),
    updateCloudStorageSuccess: (cloudStorage: CloudStorage) => (
        createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_SUCCESS, { cloudStorage })
    ),
    updateCloudStorageFailed: (cloudStorage: CloudStorage, error: any) => (
        createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_FAILED, { cloudStorage, error })
    ),
    loadCloudStorageContent: () => createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT),
    loadCloudStorageContentSuccess: (cloudStorageID: number, content: any) => (
        createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT_SUCCESS, { cloudStorageID, content })
    ),
    loadCloudStorageContentFailed: (cloudStorageID: number, error: any) => (
        createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT_FAILED, { cloudStorageID, error })
    ),
    getCloudStorageStatus: (id: number) => createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_STATUS, { id }),
    getCloudStorageStatusSuccess: (cloudStorageID: number, status: string) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_STATUS_SUCCESS, { cloudStorageID, status })
    ),
    getCloudStorageStatusFailed: (cloudStorageID: number, error: any) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_STATUS_FAILED, { cloudStorageID, error })
    ),
    getCloudStoragePreview: (cloudStorageID: number) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_PREVIEW, { cloudStorageID })
    ),
    getCloudStoragePreviewSuccess: (cloudStorageID: number, preview: string) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_PREVIEW_SUCCESS, { cloudStorageID, preview })
    ),
    getCloudStoragePreviewFailed: (cloudStorageID: number, error: any) => (
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_PREVIEW_FAILED, { cloudStorageID, error })
    ),
};

export type CloudStorageActions = ActionUnion<typeof cloudStoragesActions>;

export function getCloudStoragesAsync(query: Partial<CloudStoragesQuery>): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        dispatch(cloudStoragesActions.getCloudStorages());
        dispatch(cloudStoragesActions.updateCloudStoragesGettingQuery(query));

        const filteredQuery = filterNull(query);

        let result = null;
        try {
            result = await cvat.cloudStorages.get(filteredQuery);
        } catch (error) {
            dispatch(cloudStoragesActions.getCloudStoragesFailed(error, query));
            return;
        }

        const array = Array.from(result);

        dispatch(cloudStoragesActions.getCloudStoragesSuccess(
            array,
            result.count,
            query,
        ));
    };
}

export function deleteCloudStorageAsync(cloudStorageInstance: any): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            dispatch(cloudStoragesActions.deleteCloudStorage(cloudStorageInstance.id));
            await cloudStorageInstance.delete();
        } catch (error) {
            dispatch(cloudStoragesActions.deleteCloudStorageFailed(error, cloudStorageInstance.id));
            return;
        }

        dispatch(cloudStoragesActions.deleteCloudStorageSuccess(cloudStorageInstance.id));
    };
}

export function createCloudStorageAsync(data: any): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const cloudStorageInstance = new cvat.classes.CloudStorage(data);

        dispatch(cloudStoragesActions.createCloudStorage());
        try {
            const savedCloudStorage = await cloudStorageInstance.save();
            dispatch(cloudStoragesActions.createCloudStorageSuccess(savedCloudStorage.id));
        } catch (error) {
            dispatch(cloudStoragesActions.createCloudStorageFailed(error));
        }
    };
}

export function updateCloudStorageAsync(data: any): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const cloudStorageInstance = new cvat.classes.CloudStorage(data);

        dispatch(cloudStoragesActions.updateCloudStorage());
        try {
            const savedCloudStorage = await cloudStorageInstance.save();
            dispatch(cloudStoragesActions.updateCloudStorageSuccess(savedCloudStorage));
        } catch (error) {
            dispatch(cloudStoragesActions.updateCloudStorageFailed(data, error));
        }
    };
}

export function loadCloudStorageContentAsync(cloudStorage: CloudStorage): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        dispatch(cloudStoragesActions.loadCloudStorageContent());
        try {
            const result = await cloudStorage.getContent();
            dispatch(cloudStoragesActions.loadCloudStorageContentSuccess(cloudStorage.id, result));
        } catch (error) {
            dispatch(cloudStoragesActions.loadCloudStorageContentFailed(cloudStorage.id, error));
        }
    };
}

export function getCloudStorageStatusAsync(cloudStorage: CloudStorage): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        dispatch(cloudStoragesActions.getCloudStorageStatus(cloudStorage.id));
        try {
            const result = await cloudStorage.getStatus();
            dispatch(cloudStoragesActions.getCloudStorageStatusSuccess(cloudStorage.id, result));
        } catch (error) {
            dispatch(cloudStoragesActions.getCloudStorageStatusFailed(cloudStorage.id, error));
        }
    };
}

export function getCloudStoragePreviewAsync(cloudStorage: CloudStorage): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        dispatch(cloudStoragesActions.getCloudStoragePreview(cloudStorage.id));
        try {
            const result = await cloudStorage.preview();
            dispatch(cloudStoragesActions.getCloudStoragePreviewSuccess(cloudStorage.id, result));
        } catch (error) {
            dispatch(cloudStoragesActions.getCloudStoragePreviewFailed(cloudStorage.id, error));
        }
    };
}
