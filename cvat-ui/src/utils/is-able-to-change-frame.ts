// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
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

    const frameInTheJob = true;
    if (typeof frame === 'number') {
        if (meta.includedFrames) {
            // frame argument comes in job coordinates
            // hovewer includedFrames contains absolute data values
            return meta.includedFrames.includes(meta.getDataFrameNumber(frame - job.startFrame));
        }

        return frame >= job.startFrame && frame <= job.stopFrame;
    }

    return canvas.isAbleToChangeFrame() && frameInTheJob && !state.annotation.player.navigationBlocked;
}
