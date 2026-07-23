// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioIntervalState } from 'cvat-core-wrapper';
import { toClipboard } from 'utils/to-clipboard';
import { clamp } from 'utils/math';

export interface AudioTimeRange {
    start: number;
    end: number;
}

export function intervalID(interval: AudioIntervalState): number {
    return interval.clientID as number;
}

export function waveRegionId(interval: AudioIntervalState): string {
    return String(intervalID(interval));
}

export function clientIDFromWaveRegionId(id: string): number | null {
    const clientID = Number(id);
    return Number.isInteger(clientID) ? clientID : null;
}

export function intervalStartSeconds(interval: AudioIntervalState): number {
    return interval.start / 1000;
}

export function intervalEndSeconds(interval: AudioIntervalState): number {
    return (interval.stop ?? interval.start) / 1000;
}

export function intervalDurationSeconds(interval: AudioIntervalState): number {
    return Math.max(0, intervalEndSeconds(interval) - intervalStartSeconds(interval));
}

export function copyAudioIntervalURL(serverID?: number | null): void {
    if (Number.isInteger(serverID)) {
        const { origin, pathname } = window.location;
        toClipboard(`${origin}${pathname}?type=interval&serverID=${serverID}`);
    }
}

export function clampRange(range: AudioTimeRange, duration: number): AudioTimeRange {
    const start = clamp(range.start, 0, duration);
    return {
        start,
        end: clamp(range.end, start, duration),
    };
}
