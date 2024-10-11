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

    let frameInTheJob = true;
    if (typeof frame === 'number') {
        // frame argument comes in relative job coordinates
        // hovewer includedFrames contains absolute values, so, we need to adjust it with the frameStep and startFrame
        frameInTheJob = meta.includedFrames ?
            meta.includedFrames.includes(frame * meta.frameStep + meta.startFrame) :
            frame >= job.startFrame && frame <= job.stopFrame;
    }

    return canvas.isAbleToChangeFrame() && frameInTheJob && !state.annotation.player.navigationBlocked;
}
