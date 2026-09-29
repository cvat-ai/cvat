// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { CombinedState } from 'reducers';

export default function getHiddenZLayers(state: CombinedState): Set<number> {
    const frame = state.annotation.player.frame.number;
    return state.annotation.annotations.zLayer.hiddenByFrame.get(frame) || new Set<number>();
}
