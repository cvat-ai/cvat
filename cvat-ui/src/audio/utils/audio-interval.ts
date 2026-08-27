// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioIntervalState } from 'cvat-core-wrapper';

import { MIN_INTERVAL_DURATION } from './waveform-geometry';

export function isAudioIntervalWithinSplitRange(
    interval: AudioIntervalState,
    duration: number,
    playbackPosition: number,
): boolean {
    const minimumDuration = MIN_INTERVAL_DURATION * 1000;
    const stop = interval.stop ?? duration * 1000;
    return playbackPosition - interval.start > minimumDuration && stop - playbackPosition > minimumDuration;
}

export function isAudioIntervalSplittableAtPlaybackPosition(
    interval: AudioIntervalState,
    duration: number,
    playbackPosition: number,
): boolean {
    return !interval.hidden && !interval.lock && !interval.pinned &&
        isAudioIntervalWithinSplitRange(interval, duration, playbackPosition);
}
