// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Job } from 'cvat-core-wrapper';
import { ShapeType, DimensionType } from 'cvat-core/src/enums';
import ObjectState from 'cvat-core/src/object-state';
import { SettingsState } from 'reducers';

export function clampOpacity(
    states: ObjectState[],
    shapes: SettingsState['shapes'],
    job?: Job,
): [number, number] {
    const ENHANCED_DEFAULT_OPACITY = 30;
    const ENHANCED_DEFAULT_SELECTED_OPACITY = 60;

    if (shapes.opacity >= ENHANCED_DEFAULT_OPACITY && shapes.selectedOpacity >= ENHANCED_DEFAULT_SELECTED_OPACITY) {
        return [shapes.opacity, shapes.selectedOpacity];
    }

    const opacity = Math.max(shapes.opacity, ENHANCED_DEFAULT_OPACITY);
    const selectedOpacity = Math.max(shapes.selectedOpacity, ENHANCED_DEFAULT_SELECTED_OPACITY);

    if (job?.dimension === DimensionType.DIMENSION_3D) {
        return [opacity, selectedOpacity];
    }

    const withMasks = states
        .some((_state: ObjectState): boolean => _state.shapeType === ShapeType.MASK);
    if (withMasks) {
        return [opacity, selectedOpacity];
    }

    return [shapes.opacity, shapes.selectedOpacity];
}
