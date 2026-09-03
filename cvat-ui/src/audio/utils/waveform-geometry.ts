// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { clamp } from 'utils/math';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 300;

export const MIN_INTERVAL_DURATION = 0.001;
export const INTERVAL_BOUNDARY_EPSILON = 0.001;
export const MIN_RECORDING_DURATION = 0.05;

export const MINIMAP_TIMELINE_HEIGHT = 18;

export function computeWaveformZoom(displayZoom: number, durationSec: number, containerWidth: number): number {
    if (durationSec <= 0 || containerWidth <= 0) return 1;
    return Math.max(1, (containerWidth / durationSec) * displayZoom);
}

export function computeFitIntervalPixelsPerSecond(
    start: number,
    end: number,
    duration: number,
    viewportWidth: number,
    safeInset: number,
): number {
    const intervalDuration = end - start;
    const centeredPixelsPerSecond = (viewportWidth - safeInset * 2) / intervalDuration;
    if (
        start * centeredPixelsPerSecond >= safeInset &&
        (duration - end) * centeredPixelsPerSecond >= safeInset
    ) {
        return centeredPixelsPerSecond;
    }

    const startEdgePixelsPerSecond = (viewportWidth - safeInset) / end;
    if ((duration - end) * startEdgePixelsPerSecond >= safeInset) {
        return startEdgePixelsPerSecond;
    }

    const endEdgePixelsPerSecond = (viewportWidth - safeInset) / (duration - start);
    if (start * endEdgePixelsPerSecond >= safeInset) {
        return endEdgePixelsPerSecond;
    }

    return viewportWidth / duration;
}

export function centeredScrollOffsetForTime(
    timeSec: number,
    pixelsPerSecond: number,
    viewportWidth: number,
    maximumScroll: number,
): number {
    return clamp(timeSec * pixelsPerSecond - viewportWidth / 2, 0, maximumScroll);
}

export function limitZoom(value: number): number {
    return clamp(value, ZOOM_MIN, ZOOM_MAX);
}
