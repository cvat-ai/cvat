// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { CombinedState } from 'reducers/interfaces';

export default function isAbleToChangeFrame(): boolean {
    const store = getCVATStore();

    const state: CombinedState = store.getState();
    return state.annotation.canvas.instance.isAbleToChangeFrame() && !state.annotation.player.navigationBlocked;
}
