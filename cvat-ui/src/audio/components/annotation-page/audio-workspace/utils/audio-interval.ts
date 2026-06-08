// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioIntervalState } from 'cvat-core-wrapper';

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
