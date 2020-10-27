// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export enum AboutActionTypes {
    GET_ABOUT = 'GET_ABOUT',
    GET_ABOUT_SUCCESS = 'GET_ABOUT_SUCCESS',
    GET_ABOUT_FAILED = 'GET_ABOUT_FAILED',
}

const aboutActions = {
    getAbout: () => createAction(AboutActionTypes.GET_ABOUT),
    getAboutSuccess: (server: any) => createAction(AboutActionTypes.GET_ABOUT_SUCCESS, { server }),
    getAboutFailed: (error: any) => createAction(AboutActionTypes.GET_ABOUT_FAILED, { error }),
};

export type AboutActions = ActionUnion<typeof aboutActions>;

export const getAboutAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(aboutActions.getAbout());

    try {
        const about = await core.server.about();
        dispatch(aboutActions.getAboutSuccess(about));
    } catch (error) {
        dispatch(aboutActions.getAboutFailed(error));
    }
};
