// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { LogType } from 'cvat-logger';
import { computeZRange } from './annotation-actions';

const cvat = getCore();

export enum BoundariesActionTypes {
    RESET_AFTER_ERROR = 'RESET_AFTER_ERROR',
    THROW_RESET_ERROR = 'THROW_RESET_ERROR',
}

export const boundariesActions = {
    resetAfterError: (
        job: any,
        states: any[],
        openTime: number | null,
        frameNumber: number,
        frameFilename: string,
        frameHasRelatedContext: boolean,
        colors: string[],
        filters: string[],
        frameData: any | null,
        minZ: number,
        maxZ: number,
    ) => createAction(BoundariesActionTypes.RESET_AFTER_ERROR, {
        job,
        states,
        openTime,
        frameNumber,
        frameFilename,
        frameHasRelatedContext,
        colors,
        filters,
        frameData,
        minZ,
        maxZ,
    }),
    throwResetError: () => createAction(BoundariesActionTypes.THROW_RESET_ERROR),
};

export function resetAfterErrorAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const state = getState();
            const job = state.annotation.job.instance;

            if (job) {
                const currentFrame = state.annotation.player.frame.number;
                const { showAllInterpolationTracks } = state.settings.workspace;
                const frameNumber = Math.max(Math.min(job.stopFrame, currentFrame), job.startFrame);

                const states = await job.annotations.get(frameNumber, showAllInterpolationTracks, []);
                const frameData = await job.frames.get(frameNumber);
                const [minZ, maxZ] = computeZRange(states);
                const colors = [...cvat.enums.colors];

                await job.logger.log(LogType.restoreJob);

                dispatch(boundariesActions.resetAfterError(
                    job,
                    states,
                    state.annotation.job.openTime || Date.now(),
                    frameNumber,
                    frameData.filename,
                    frameData.hasRelatedContext,
                    colors,
                    [],
                    frameData,
                    minZ,
                    maxZ,
                ));
            } else {
                dispatch(boundariesActions.resetAfterError(
                    null, [], null, 0, '', false, [], [], null, 0, 0,
                ));
            }
        } catch (error) {
            dispatch(boundariesActions.throwResetError());
        }
    };
}

export type BoundariesActions = ActionUnion<typeof boundariesActions>;
