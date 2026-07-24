// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioIntervalState } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { toClipboard } from 'utils/to-clipboard';
import { clamp } from 'utils/math';
import type { AudioTimeRange, ClosedAudioInterval } from 'audio/utils/audio-interval';

export {
    intervalToTimeRange, timeRangeToInterval,
} from 'audio/utils/audio-interval';
export type { AudioTimeRange } from 'audio/utils/audio-interval';
export type { ClosedAudioInterval } from 'audio/utils/audio-interval';

function isClosedInterval(interval: AudioIntervalState): interval is ClosedAudioInterval {
    return interval.stop !== null;
}

/**
 * React renders closed intervals only. Keep raw Redux intervals unchanged so
 * save actions can preserve the backend's open-ended (`stop: null`) state.
 */
export function selectAudioIntervals(state: CombinedState): ClosedAudioInterval[] {
    const { intervals } = state.audio.player;
    const maxFrame = (state.annotation.job.meta?.size ?? 1) - 1;

    return intervals.map((interval) => {
        if (isClosedInterval(interval)) {
            return interval;
        }

        return { ...interval, stop: Math.max(maxFrame, interval.start) } as ClosedAudioInterval;
    });
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
