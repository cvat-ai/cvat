// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { CombinedState } from 'reducers';

export default function isAbleToChangeFrame(frame?: number): boolean {
    const store = getCVATStore();

    const state: CombinedState = store.getState();
    const { meta, instance: job } = state.annotation.job;
    const { instance: canvas } = state.annotation.canvas;

    if (meta === null || canvas === null || !job) {
        return false;
    }

    let frameInTheJob = true;
    if (typeof frame === 'number') {
        if (meta.includedFrames) {
            // frame argument comes in job coordinates
            // however includedFrames contains absolute data values
            frameInTheJob = meta.includedFrames.includes(meta.getDataFrameNumber(frame - job.startFrame));
        }

        frameInTheJob = frame >= job.startFrame && frame <= job.stopFrame;
    }

    return canvas.isAbleToChangeFrame() && frameInTheJob && !state.annotation.player.navigationBlocked;
}
