// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { GrowthActions, GrowthActionTypes } from 'actions/growth-actions';
import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { GrowthState } from '.';

const defaultState: GrowthState = {
    data: null,
    fetching: false,
    initialized: false,
};

export default function (
    state: GrowthState = defaultState,
    action: GrowthActions | AuthActions | BoundariesActions,
): GrowthState {
    switch (action.type) {
        case GrowthActionTypes.GET_GROWTH_DATA:
            return { ...state, fetching: true, initialized: false };
        case GrowthActionTypes.GET_GROWTH_DATA_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                data: action.payload.growthData,
            };
        case GrowthActionTypes.GET_GROWTH_DATA_FAILED:
            return { ...state, fetching: false, initialized: true };
        case GrowthActionTypes.UPDATE_GROWTH_DATA:
            return { ...state, fetching: true };
        case GrowthActionTypes.UPDATE_GROWTH_DATA_SUCCESS:
            return { ...state, fetching: false, data: action.payload.growthData };
        case GrowthActionTypes.UPDATE_GROWTH_DATA_FAILED:
            return { ...state, fetching: false };
        case AuthActionTypes.LOGOUT_SUCCESS:
        case BoundariesActionTypes.RESET_AFTER_ERROR:
            return { ...defaultState };
        default:
            return state;
    }
}
