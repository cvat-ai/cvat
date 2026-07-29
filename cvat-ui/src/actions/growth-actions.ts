// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, SerializedUserGrowthData, UserGrowthDataModifiableFields } from 'cvat-core-wrapper';
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
    getGrowthDataSuccess: (growthData: SerializedUserGrowthData | null) => (
        createAction(GrowthActionTypes.GET_GROWTH_DATA_SUCCESS, { growthData })
    ),
    getGrowthDataFailed: (error: unknown) => createAction(GrowthActionTypes.GET_GROWTH_DATA_FAILED, { error }),
    updateGrowthData: () => createAction(GrowthActionTypes.UPDATE_GROWTH_DATA),
    updateGrowthDataSuccess: (growthData: SerializedUserGrowthData) => (
        createAction(GrowthActionTypes.UPDATE_GROWTH_DATA_SUCCESS, { growthData })
    ),
    updateGrowthDataFailed: (error: unknown) => createAction(GrowthActionTypes.UPDATE_GROWTH_DATA_FAILED, { error }),
};

export type GrowthActions = ActionUnion<typeof growthActions>;

export const getGrowthDataAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(growthActions.getGrowthData());

    try {
        const [growthData = null] = await core.growth.get();
        dispatch(growthActions.getGrowthDataSuccess(growthData));
    } catch (error) {
        dispatch(growthActions.getGrowthDataFailed(error));
    }
};

export const updateGrowthDataAsync = (
    id: number,
    fields: UserGrowthDataModifiableFields,
): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(growthActions.updateGrowthData());

    try {
        const growthData = await core.growth.update(id, fields);
        dispatch(growthActions.updateGrowthDataSuccess(growthData));
    } catch (error) {
        dispatch(growthActions.updateGrowthDataFailed(error));
    }
};
