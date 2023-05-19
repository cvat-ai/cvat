// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';

import { ShareFileInfo } from 'reducers';

const core = getCore();

export enum ShareActionTypes {
    LOAD_SHARE_DATA = 'LOAD_SHARE_DATA',
    LOAD_SHARE_DATA_SUCCESS = 'LOAD_SHARE_DATA_SUCCESS',
    LOAD_SHARE_DATA_FAILED = 'LOAD_SHARE_DATA_FAILED',
}

const shareActions = {
    loadShareData: () => createAction(ShareActionTypes.LOAD_SHARE_DATA),
    loadShareDataSuccess: (values: ShareFileInfo[], directory: string) => (
        createAction(ShareActionTypes.LOAD_SHARE_DATA_SUCCESS, {
            values,
            directory,
        })
    ),
    loadShareDataFailed: (error: any) => createAction(ShareActionTypes.LOAD_SHARE_DATA_FAILED, { error }),
};

export type ShareActions = ActionUnion<typeof shareActions>;

export function loadShareDataAsync(directory: string): ThunkAction<Promise<ShareFileInfo[]>> {
    return async (dispatch): Promise<ShareFileInfo[]> => {
        try {
            dispatch(shareActions.loadShareData());
            const values = await core.server.share(directory);
            dispatch(shareActions.loadShareDataSuccess(values as ShareFileInfo[], directory));
            return (values as ShareFileInfo[]);
        } catch (error) {
            dispatch(shareActions.loadShareDataFailed(error));
            throw error;
        }
    };
}
