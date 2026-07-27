// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Label, Source } from 'cvat-core-wrapper';
import { clamp } from 'utils/math';

export interface AudioTimeRange {
    /** Start of the range, seconds */
    start: number;
    /** End of the range, seconds */
    end: number;
}

/** Interval data with resolved non-null stop value */
export interface ClosedAudioInterval {
    clientID: number | null;
    serverID: number | null;
    start: number;
    stop: number;
    color: string;
    hidden: boolean;
    lock: boolean;
    label: Label;
    source: Source;
    attributes: Record<number, string>;
}

const MILLISECONDS_PER_SECOND = 1000;
const MILLISECOND_SNAP_EPSILON = 0.1;

function snapMilliseconds(milliseconds: number): number {
    const nearestMillisecond = Math.round(milliseconds);

    // WAV duration is quantized to whole samples. At the lowest supported Web
    // Audio rate (8 kHz), rounding changes the logical duration by at most
    // 0.0625 ms. Snapping within 0.1 ms absorbs that tail (and float noise)
    // without affecting the backend's 1 ms frame resolution.
    return Math.abs(milliseconds - nearestMillisecond) < MILLISECOND_SNAP_EPSILON ?
        nearestMillisecond : milliseconds;
}

export function intervalToTimeRange(interval: ClosedAudioInterval): AudioTimeRange {
    // Backend interval boundaries are inclusive millisecond-frame indices. UI
    // regions are half-open time ranges, so frame 100 is [0.100, 0.101), not
    // a zero-length range ending at 0.100.
    return {
        start: interval.start / MILLISECONDS_PER_SECOND,
        end: (interval.stop + 1) / MILLISECONDS_PER_SECOND,
    };
}

export function timeRangeToInterval(
    range: AudioTimeRange,
    maxFrame: number,
): { start: number; stop: number } {
    const startMilliseconds = snapMilliseconds(range.start * MILLISECONDS_PER_SECOND);
    const endMilliseconds = snapMilliseconds(range.end * MILLISECONDS_PER_SECOND);

    // UI uses [start, end), while the backend intervals include both endpoints.
    // Include every millisecond frame touched by the selected range: floor the
    // start, then turn its exclusive end into an inclusive index via ceil - 1.
    const start = clamp(Math.floor(startMilliseconds), 0, maxFrame);
    const stop = clamp(Math.ceil(endMilliseconds) - 1, start, maxFrame);

    return { start, stop };
}
