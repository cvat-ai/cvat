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

/**
 * React renders closed intervals only. Keep raw Redux intervals unchanged so
 * save actions can preserve the backend's open-ended (`stop: null`) state.
 */
export function selectAudioIntervals(state: CombinedState): ClosedAudioInterval[] {
    const { intervals } = state.audio.player;
    const maxFrame = (state.annotation.job.meta?.size ?? 1) - 1;

    return intervals.map((interval): ClosedAudioInterval => ({
        clientID: interval.clientID,
        serverID: interval.serverID,
        start: interval.start,
        stop: interval.stop ?? Math.max(maxFrame, interval.start),
        color: interval.color,
        hidden: interval.hidden,
        lock: interval.lock,
        label: interval.label,
        source: interval.source,
        attributes: interval.attributes,
    }));
}

export function intervalID(interval: Pick<AudioIntervalState, 'clientID'>): number {
    return interval.clientID as number;
}

export function waveRegionId(interval: Pick<AudioIntervalState, 'clientID'>): string {
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
