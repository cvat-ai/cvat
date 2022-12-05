// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();

export enum HealthCheckActionTypes {
    GET_HEALTH = 'GET_HEALTH',
    GET_HEALTH_SUCCESS = 'GET_HEALTH_SUCCESS',
    GET_HEALTH_FAILED = 'GET_HEALTH_FAILED',
}

const healthCheckActions = {
    getHealthCheck: () => createAction(HealthCheckActionTypes.GET_HEALTH),
    getHealthSuccess: (serverHealth: any) => createAction(HealthCheckActionTypes.GET_HEALTH_SUCCESS, { serverHealth }),
    getHealthFailed: (error: any) => createAction(HealthCheckActionTypes.GET_HEALTH_FAILED, { error }),
};

export type HealthActions = ActionUnion<typeof healthCheckActions>;

export const getHealthAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(healthCheckActions.getHealthCheck());

    try {
        const serverHealth = await core.server.healthCheck(5, 3000, 5); //pass args here
        dispatch(healthCheckActions.getHealthSuccess(serverHealth));
    } catch (error) {
        dispatch(healthCheckActions.getHealthFailed(error));
    }
};
