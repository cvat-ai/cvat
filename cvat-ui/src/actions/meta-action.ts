// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';
import { MetaState } from '../reducers/interfaces';


const core = getCore();

export enum MetaActionTypes {
    GET_ALLOWED_APPS = 'GET_ALLOWED_APPS',
    GET_ALLOWED_APPS_SUCCESS = 'GET_ALLOWED_APPS_SUCCESS',
    GET_ALLOWED_APPS_FAILED = 'GET_ALLOWED_APPS_FAILED',
}

export const allowedAppsActions = {
    getAllowedApps: () => createAction(MetaActionTypes.GET_ALLOWED_APPS),
    getAllowedAppsSuccess: (data: MetaState) => createAction(MetaActionTypes.GET_ALLOWED_APPS_SUCCESS, {data}),
    getAllowedAppsFailed: (error: any) => createAction(MetaActionTypes.GET_ALLOWED_APPS_FAILED, {error}),
};

export type AllowedAppsActions = ActionUnion<typeof allowedAppsActions>;

export const getAllowedAppsAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(allowedAppsActions.getAllowedApps());

    try {
        const allowedApps: string[] = await core.allowedApps.list();

        const data: MetaState = {
            showTasksButton: allowedApps.includes('tasks'),
            showAnalyticsButton: allowedApps.includes('analytics'),
            showModelsButton: allowedApps.includes('serverless'),
        };
        console.log(data);
        dispatch(
            allowedAppsActions.getAllowedAppsSuccess(data),
        );
    } catch (error) {
        dispatch(allowedAppsActions.getAllowedAppsFailed(error));
    }
};
