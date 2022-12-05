// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { ServerError } from 'cvat-core/src/exceptions';

const core = getCore();

export enum HealthCheckActionTypes {
    GET_HEALTH = 'GET_HEALTH',
    GET_HEALTH_SUCCESS = 'GET_HEALTH_SUCCESS',
    GET_HEALTH_FAILED = 'GET_HEALTH_FAILED',
    GET_HEALTH_PROGRESS = 'GET_HEALTH_PROGRESS',
}

const healthCheckActions = {
    getHealthCheck: () => createAction(HealthCheckActionTypes.GET_HEALTH),
    getHealthCheckSuccess: () => createAction(HealthCheckActionTypes.GET_HEALTH_SUCCESS),
    getHealthCheckFailed: (error: any) => createAction(HealthCheckActionTypes.GET_HEALTH_FAILED, { error }),
    getHealthCheckProgress: (progress: string) => createAction(
        HealthCheckActionTypes.GET_HEALTH_PROGRESS, { progress },
    ),
};

export type HealthActions = ActionUnion<typeof healthCheckActions>;

export const getHealthAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    const healthCheck = async (maxRetries: number, checkPeriod: number, requestTimeout: number, attempt = 0) => {
        dispatch(healthCheckActions.getHealthCheckProgress(`${attempt}/${attempt + maxRetries}`));
        return core.server.healthCheck(requestTimeout)
            .catch((serverError: ServerError) => {
                if (maxRetries > 0) {
                    return new Promise((resolve) => setTimeout(resolve, checkPeriod))
                        .then(() => healthCheck(maxRetries - 1, checkPeriod, requestTimeout, attempt + 1));
                }
                throw serverError;
            });
    };

    dispatch(healthCheckActions.getHealthCheck());

    const maxRetries = 10;
    const checkPeriod = 3000; // ms
    const requestTimeout = 5000; // ms

    try {
        await healthCheck(maxRetries, checkPeriod, requestTimeout);
        dispatch(healthCheckActions.getHealthCheckSuccess());
    } catch (error) {
        dispatch(healthCheckActions.getHealthCheckFailed(error));
    }
};
