// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 300;

export function computeWaveformZoom(displayZoom: number, duration: number, containerWidth: number): number {
    if (!duration || duration <= 0 || !containerWidth || containerWidth <= 0) return 1;

    const fittedPxPerSecond = containerWidth / duration;
    return Math.max(1, fittedPxPerSecond * displayZoom);
}
