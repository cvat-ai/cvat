// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { clamp } from 'utils/math';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 300;
export const MIN_WAVEFORM_PIXELS_PER_SECOND = 8;

const FIT_INTERVAL_SAFE_INSET_RATIO = 0.1;
const FIT_INTERVAL_MIN_SAFE_INSET_RATIO = 0.03;

export const MIN_INTERVAL_DURATION = 0.001;
export const INTERVAL_BOUNDARY_EPSILON = 0.001;
export const MIN_RECORDING_DURATION = 0.05;

export const MINIMAP_HEIGHT = 50;
export const MINIMAP_TIMELINE_HEIGHT = 18;

export function computeWaveformBasePixelsPerSecond(durationSec: number, containerWidth: number): number {
    if (durationSec <= 0 || containerWidth <= 0) {
        return MIN_WAVEFORM_PIXELS_PER_SECOND;
    }

    let pixelsPerSecond = containerWidth / durationSec;

    // WaveSurfer rounds its calculated track width up. Protect the exact fit case
    // from floating-point multiplication producing a one-pixel horizontal scroll.
    if (Math.ceil(durationSec * pixelsPerSecond) > containerWidth) {
        pixelsPerSecond -= Number.EPSILON * Math.max(1, pixelsPerSecond);
    }

    return Math.max(
        MIN_WAVEFORM_PIXELS_PER_SECOND,
        pixelsPerSecond,
    );
}

export function computeWaveformZoom(displayZoom: number, durationSec: number, containerWidth: number): number {
    return computeWaveformBasePixelsPerSecond(durationSec, containerWidth) * displayZoom;
}

function computeFitIntervalPixelsPerSecond(
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

export interface FitIntervalGeometry {
    pixelsPerSecond: number;
    safeInset: number;
}

export function computeFitIntervalGeometry(
    start: number,
    end: number,
    duration: number,
    viewportWidth: number,
    basePixelsPerSecond: number,
): FitIntervalGeometry {
    const minimumSafeInset = viewportWidth * FIT_INTERVAL_MIN_SAFE_INSET_RATIO;
    const maximumSafeInset = viewportWidth * FIT_INTERVAL_SAFE_INSET_RATIO;
    const trackWidth = duration * basePixelsPerSecond;
    const intervalStart = start * basePixelsPerSecond;
    const intervalEnd = end * basePixelsPerSecond;
    const intervalWidth = intervalEnd - intervalStart;
    const spaceBeforeInterval = intervalStart;
    const spaceAfterInterval = trackWidth - intervalEnd;
    const freeViewportSpace = viewportWidth - intervalWidth;
    let maximumFitInset = 0;

    // Center the interval when it, along with equal insets, fits inside the viewport.
    if (freeViewportSpace > 0) {
        const centeredInset = Math.min(
            freeViewportSpace / 2,
            spaceBeforeInterval,
            spaceAfterInterval,
        );
        if (centeredInset > maximumFitInset) {
            maximumFitInset = centeredInset;
        }
    }

    // Anchor the viewport at the track start when the interval end is visible there.
    if (intervalEnd <= viewportWidth) {
        const startAnchoredInset = Math.min(
            viewportWidth - intervalEnd,
            spaceAfterInterval,
        );
        if (startAnchoredInset > maximumFitInset) {
            maximumFitInset = startAnchoredInset;
        }
    }

    // Anchor the viewport at the track end when the interval start is visible there.
    const viewportStartAtTrackEnd = trackWidth - viewportWidth;
    if (intervalStart >= viewportStartAtTrackEnd) {
        const endAnchoredInset = Math.min(
            intervalStart - viewportStartAtTrackEnd,
            spaceBeforeInterval,
        );
        if (endAnchoredInset > maximumFitInset) {
            maximumFitInset = endAnchoredInset;
        }
    }

    const safeInset = clamp(maximumFitInset, minimumSafeInset, maximumSafeInset);

    return {
        pixelsPerSecond: computeFitIntervalPixelsPerSecond(start, end, duration, viewportWidth, safeInset),
        safeInset,
    };
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
