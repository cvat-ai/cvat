// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { fetchAnnotationsAsync } from './annotation-actions';

const cvat = getCore();

export enum BoundariesActionTypes {
    RESET_AFTER_ERROR = 'RESET_AFTER_ERROR',
    THROW_RESET_ERROR = 'THROW_RESET_ERROR',
}

export const boundariesActions = {
    resetAfterError: (payload?: {
        job: any;
        states: any[];
        openTime: number;
        frameNumber: number;
        frameFilename: string;
        relatedFiles: number;
        colors: string[];
        filters: string[];
        frameData: any;
        minZ: number;
        maxZ: number;
    }) => createAction(BoundariesActionTypes.RESET_AFTER_ERROR, payload),
    throwResetError: () => createAction(BoundariesActionTypes.THROW_RESET_ERROR),
};

export function resetAfterErrorAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const state = getState();
            const job = state.annotation.job.instance;

            if (job) {
                const currentFrame = state.annotation.player.frame.number;
                const frameNumber = Math.max(Math.min(job.stopFrame, currentFrame), job.startFrame);
                const frameData = await job.frames.get(frameNumber);
                const colors = [...cvat.enums.colors];

                dispatch(boundariesActions.resetAfterError({
                    job,
                    states: [],
                    openTime: state.annotation.job.openTime || Date.now(),
                    frameNumber,
                    frameFilename: frameData.filename,
                    relatedFiles: frameData.relatedFiles,
                    colors,
                    filters: [],
                    frameData,
                    minZ: 0,
                    maxZ: 0,
                }));

                dispatch(fetchAnnotationsAsync());
            }
        } catch (error) {
            dispatch(boundariesActions.throwResetError());
        }
    };
}

export type BoundariesActions = ActionUnion<typeof boundariesActions>;
