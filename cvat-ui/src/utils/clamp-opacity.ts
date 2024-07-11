// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SettingsState } from 'reducers';

export function clampOpacity(
    annotationsIncludeMasks: boolean,
    shapes: SettingsState['shapes'],
): [number, number] {
    const ENHANCED_DEFAULT_OPACITY = 30;
    const ENHANCED_DEFAULT_SELECTED_OPACITY = 60;

    if (shapes.opacity >= ENHANCED_DEFAULT_OPACITY && shapes.selectedOpacity >= ENHANCED_DEFAULT_SELECTED_OPACITY) {
        return [shapes.opacity, shapes.selectedOpacity];
    }

    if (!annotationsIncludeMasks) {
        return [shapes.opacity, shapes.selectedOpacity];
    }

    const opacity = Math.max(shapes.opacity, ENHANCED_DEFAULT_OPACITY);
    const selectedOpacity = Math.max(shapes.selectedOpacity, ENHANCED_DEFAULT_SELECTED_OPACITY);

    return [opacity, selectedOpacity];
}
