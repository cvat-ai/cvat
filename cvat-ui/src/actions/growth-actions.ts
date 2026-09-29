// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, UserGrowthData, UserGrowthDataModifiableFields } from 'cvat-core-wrapper';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const core = getCore();

export enum GrowthActionTypes {
    GET_GROWTH_DATA = 'GET_GROWTH_DATA',
    GET_GROWTH_DATA_SUCCESS = 'GET_GROWTH_DATA_SUCCESS',
    GET_GROWTH_DATA_FAILED = 'GET_GROWTH_DATA_FAILED',
    UPDATE_GROWTH_DATA = 'UPDATE_GROWTH_DATA',
    UPDATE_GROWTH_DATA_SUCCESS = 'UPDATE_GROWTH_DATA_SUCCESS',
    UPDATE_GROWTH_DATA_FAILED = 'UPDATE_GROWTH_DATA_FAILED',
}

const growthActions = {
    getGrowthData: () => createAction(GrowthActionTypes.GET_GROWTH_DATA),
    getGrowthDataSuccess: (growthData: UserGrowthData | null) => (
        createAction(GrowthActionTypes.GET_GROWTH_DATA_SUCCESS, { growthData })
    ),
    getGrowthDataFailed: (error: unknown) => createAction(GrowthActionTypes.GET_GROWTH_DATA_FAILED, { error }),
    updateGrowthData: () => createAction(GrowthActionTypes.UPDATE_GROWTH_DATA),
    updateGrowthDataSuccess: (growthData: UserGrowthData) => (
        createAction(GrowthActionTypes.UPDATE_GROWTH_DATA_SUCCESS, { growthData })
    ),
    updateGrowthDataFailed: (error: unknown) => createAction(GrowthActionTypes.UPDATE_GROWTH_DATA_FAILED, { error }),
};

export type GrowthActions = ActionUnion<typeof growthActions>;

export const getGrowthDataAsync = (): ThunkAction => async (dispatch, getState): Promise<void> => {
    const { user } = getState().auth;
    if (!user) {
        return;
    }

    dispatch(growthActions.getGrowthData());

    try {
        const [growthData = null] = await core.growth.get(user.id);
        dispatch(growthActions.getGrowthDataSuccess(growthData));
    } catch (error) {
        dispatch(growthActions.getGrowthDataFailed(error));
    }
};

export const updateGrowthDataAsync = (
    fields: UserGrowthDataModifiableFields,
): ThunkAction => async (dispatch, getState): Promise<void> => {
    const { data: growthData } = getState().growth;
    if (!growthData) {
        return;
    }

    dispatch(growthActions.updateGrowthData());

    try {
        const updatedGrowthData = await growthData.save(fields);
        dispatch(growthActions.updateGrowthDataSuccess(updatedGrowthData));
    } catch (error) {
        dispatch(growthActions.updateGrowthDataFailed(error));
    }
};
