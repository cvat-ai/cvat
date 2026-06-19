// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

let playOnceRegionId: string | null = null;

export function setPlayOnceRegionId(id: string | null): void {
    playOnceRegionId = id;
}

export function getPlayOnceRegionId(): string | null {
    return playOnceRegionId;
}

// Pending "play just this interval" target (set on interval double-click). When set, playback is
// started via wavesurfer.play(start, end) so the WebAudio backend schedules a sample-accurate stop
// at `end` (bufferNode.stop) instead of overshooting on the ~16ms timeupdate poll.
let playInterval: { start: number; end: number } | null = null;

export function setPlayInterval(interval: { start: number; end: number } | null): void {
    playInterval = interval;
}

export function getPlayInterval(): { start: number; end: number } | null {
    return playInterval;
}
