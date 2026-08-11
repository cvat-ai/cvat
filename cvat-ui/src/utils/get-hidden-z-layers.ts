// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { CombinedState } from 'reducers';

const EMPTY_HIDDEN_Z_LAYERS = new Set<number>();

export default function getHiddenZLayers(state: CombinedState): Set<number> {
    const frame = state.annotation.player.frame.number;
    return state.annotation.annotations.zLayer.hiddenByFrame.get(frame) || EMPTY_HIDDEN_Z_LAYERS;
}
