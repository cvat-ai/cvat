// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';

import { ShareFileInfo } from 'reducers/interfaces';

const core = getCore();

export enum ShareActionTypes {
    LOAD_SHARE_DATA = 'LOAD_SHARE_DATA',
    LOAD_SHARE_DATA_SUCCESS = 'LOAD_SHARE_DATA_SUCCESS',
    LOAD_SHARE_DATA_FAILED = 'LOAD_SHARE_DATA_FAILED',
}

const shareActions = {
    loadShareData: () => createAction(ShareActionTypes.LOAD_SHARE_DATA),
    loadShareDataSuccess: (values: ShareFileInfo[], directory: string) =>
        createAction(ShareActionTypes.LOAD_SHARE_DATA_SUCCESS, {
            values,
            directory,
        }),
    loadShareDataFailed: (error: any) => createAction(ShareActionTypes.LOAD_SHARE_DATA_FAILED, { error }),
};

export type ShareActions = ActionUnion<typeof shareActions>;

export function loadShareDataAsync(directory: string, success: () => void, failure: () => void): ThunkAction {
    return async (dispatch): Promise<void> => {
        try {
            dispatch(shareActions.loadShareData());
            const values = await core.server.share(directory);
            success();
            dispatch(shareActions.loadShareDataSuccess(values as ShareFileInfo[], directory));
        } catch (error) {
            failure();
            dispatch(shareActions.loadShareDataFailed(error));
        }
    };
}
