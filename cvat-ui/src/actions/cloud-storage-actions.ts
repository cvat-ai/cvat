// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Dispatch, ActionCreator } from 'redux';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';
import { CloudStoragesQuery, CloudStorage } from 'reducers/interfaces';

const cvat = getCore();

export enum CloudStorageActionTypes {
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

const cloudStoragesActions = {
    getCloudStorages: () => createAction(CloudStorageActionTypes.GET_CLOUD_STORAGES),
    getCloudStoragesSuccess: (array: any[], previews: string[], count: number, query: Partial<CloudStoragesQuery>) =>
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_SUCCESS, {
            array,
            previews,
            count,
            query,
        }),
    getCloudStoragesFailed: (error: any, query: Partial<CloudStoragesQuery>) =>
        createAction(CloudStorageActionTypes.GET_CLOUD_STORAGE_FAILED, { error, query }),
    deleteCloudStorage: (cloudStorageID: number) =>
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE, { cloudStorageID }),
    deleteCloudStorageSuccess: (cloudStorageID: number) =>
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE_SUCCESS, { cloudStorageID }),
    deleteCloudStorageFailed: (error: any, cloudStorageID: number) =>
        createAction(CloudStorageActionTypes.DELETE_CLOUD_STORAGE_FAILED, { error, cloudStorageID }),
    createCloudStorage: () => createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE),
    createCloudStorageSuccess: (cloudStorageID: number) =>
        createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE_SUCCESS, { cloudStorageID }),
    createCloudStorageFailed: (error: any) =>
        createAction(CloudStorageActionTypes.CREATE_CLOUD_STORAGE_FAILED, { error }),
    updateCloudStorage: () => createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE, {}),
    updateCloudStorageSuccess: (cloudStorage: CloudStorage) =>
        createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_SUCCESS, { cloudStorage }),
    updateCloudStorageFailed: (cloudStorage: CloudStorage, error: any) =>
        createAction(CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_FAILED, { cloudStorage, error }),
    loadCloudStorageContent: () => createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT),
    loadCloudStorageContentSuccess: (cloudStorageID: number, content: any) =>
        createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT_SUCCESS, { cloudStorageID, content }),
    loadCloudStorageContentFailed: (cloudStorageID: number, error: any) =>
        createAction(CloudStorageActionTypes.LOAD_CLOUD_STORAGE_CONTENT_FAILED, { cloudStorageID, error }),
};

export type CloudStorageActions = ActionUnion<typeof cloudStoragesActions>;

export function getCloudStoragesAsync(query: Partial<CloudStoragesQuery>): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(cloudStoragesActions.getCloudStorages());

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
            dispatch(cloudStoragesActions.getCloudStoragesFailed(error, query));
            return;
        }

        const array = Array.from(result);
        //         const promises = array.map((cloudStorage: CloudStorage):
        // string => (cloudStorage as any).frames.preview().catch(() => ''));

        dispatch(
            cloudStoragesActions.getCloudStoragesSuccess(
                array,
                array.map((): string => ''),
                result.count,
                query,
            ),
        );
    };
}

export function deleteCloudStorageAsync(cloudStorageInstance: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
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
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
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
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
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
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(cloudStoragesActions.loadCloudStorageContent());
        try {
            const result = await cloudStorage.getContent();
            const content = JSON.parse(result);
            dispatch(cloudStoragesActions.loadCloudStorageContentSuccess(cloudStorage.id, content));
        } catch (error) {
            dispatch(cloudStoragesActions.loadCloudStorageContentFailed(cloudStorage.id, error));
        }
    };
}
