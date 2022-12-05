// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { HealthActions, HealthCheckActionTypes } from 'actions/health-check-actions';
import { HealthState } from '.';

const defaultState: HealthState = {
    initialized: false,
    fetching: false,
    isHealthy: false,
};

export default function (state = defaultState, action: HealthActions | BoundariesActions): HealthState {
    switch (action.type) {
        case HealthCheckActionTypes.GET_HEALTH_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                isHealthy: true,
            };
        case HealthCheckActionTypes.GET_HEALTH_FAILED:
            return {
                ...state,
                fetching: false,
                initialized: true,
                isHealthy: false,
            };
        default:
            return state;
    }
}
