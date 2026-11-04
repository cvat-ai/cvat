// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { audioActions } from 'actions/audio-actions';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

interface Params {
    getCurrentTime(): number;
    durationRef: React.MutableRefObject<number>;
}

interface ObservedIntervalRange {
    sourceIntervalID: number;
    start: number;
    end: number;
}

/**
 * Keeps interval-sourced playback ranges in sync with their source interval.
 */
export function useIntervalPlayback({ getCurrentTime, durationRef }: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        currentPlaybackRange,
        currentPlaybackRangeSource,
        currentSourceInterval,
    } = useSelector((state: CombinedState) => {
        const { intervals } = state.audio.player;
        const { playbackRange: playerPlaybackRange } = state.audio.player;
        const { playbackRangeSource: playerPlaybackRangeSource } = state.audio.player;

        return {
            currentPlaybackRange: playerPlaybackRange,
            currentPlaybackRangeSource: playerPlaybackRangeSource,
            currentSourceInterval: playerPlaybackRangeSource === null ?
                null : intervals.find(
                    (interval) => interval.clientID === playerPlaybackRangeSource.intervalID,
                ) ?? null,
        };
    }, shallowEqual);
    const previousPlaybackRangeRef = useRef<ObservedIntervalRange | null>(null);

    useEffect(() => {
        if (!currentPlaybackRange) {
            if (currentPlaybackRangeSource) {
                dispatch(audioActions.clearAudioIntervalPlaybackSource(currentPlaybackRangeSource.rangeID));
            }
            previousPlaybackRangeRef.current = null;
            return;
        }

        if (!currentPlaybackRangeSource) {
            // Some other source of playback range, not interval
            previousPlaybackRangeRef.current = null;
            return;
        }

        const { id: currentPlaybackRangeID } = currentPlaybackRange;
        if (currentPlaybackRangeSource.rangeID !== currentPlaybackRangeID) {
            dispatch(audioActions.clearAudioIntervalPlaybackSource(currentPlaybackRangeSource.rangeID));
            previousPlaybackRangeRef.current = null;
            return;
        }

        // at this point the source exists and its range ID matches the playback range ID
        if (!currentSourceInterval) {
            // e.g. interval was deleted
            dispatch(audioActions.clearAudioPlaybackRange(currentPlaybackRangeID));
            dispatch(audioActions.clearAudioIntervalPlaybackSource(currentPlaybackRangeID));
            previousPlaybackRangeRef.current = null;
            return;
        }

        const currentSourcePlaybackRange = {
            start: currentSourceInterval.start / 1000,
            end: currentSourceInterval.stop === null ? durationRef.current : currentSourceInterval.stop / 1000,
        };
        const previousPlaybackRange = previousPlaybackRangeRef.current;
        previousPlaybackRangeRef.current = {
            sourceIntervalID: currentPlaybackRangeSource.intervalID,
            ...currentSourcePlaybackRange,
        };

        if (
            !previousPlaybackRange ||
            previousPlaybackRange?.sourceIntervalID !== currentPlaybackRangeSource.intervalID ||
            (
                previousPlaybackRange.start === currentSourcePlaybackRange.start &&
                previousPlaybackRange.end === currentSourcePlaybackRange.end
            )
        ) {
            return;
        }

        const currentTime = getCurrentTime();
        if (
            currentTime < currentSourcePlaybackRange.start ||
            currentSourcePlaybackRange.end <= currentTime
        ) {
            dispatch(audioActions.clearAudioPlaybackRange(currentPlaybackRangeID));
            dispatch(audioActions.clearAudioIntervalPlaybackSource(currentPlaybackRangeID));
            return;
        }

        dispatch(audioActions.updateAudioPlaybackRange({
            ...currentSourcePlaybackRange,
            id: currentPlaybackRangeID,
        }));
    }, [
        currentPlaybackRange,
        currentPlaybackRangeSource,
        currentSourceInterval,
    ]);
}
