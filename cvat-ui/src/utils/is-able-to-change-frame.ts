// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { CombinedState } from 'reducers';

export default function isAbleToChangeFrame(): boolean {
    const store = getCVATStore();

    const state: CombinedState = store.getState();
    const { instance } = state.annotation.canvas;

    return !!instance && instance.isAbleToChangeFrame() &&
        !state.annotation.player.navigationBlocked;
}
