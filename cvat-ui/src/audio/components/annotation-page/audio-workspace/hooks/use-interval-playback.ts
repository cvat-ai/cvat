// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { audioActions } from 'actions/audio-actions';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import {
    clientIDFromWaveRegionId, intervalEndSeconds, intervalStartSeconds,
} from '../utils/audio-interval';
import type { WaveformPlayback } from './use-waveform-playback';
import type { WaveformRegionRuntime } from './use-audio-waveform';

interface Params {
    regionRuntime: WaveformRegionRuntime;
    playback: WaveformPlayback;
    ready: boolean;
}

/**
 * Applies play-once and looping interval policies through the generic playback controller.
 */
export function useIntervalPlayback({ regionRuntime, playback, ready }: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        play, pause, seek, subscribeTimeUpdates,
    } = playback;
    const {
        request, loop, playing, activeIntervalID, intervals,
    } = useSelector((state: CombinedState) => ({
        request: state.audio.player.playIntervalOnceRequest,
        loop: state.audio.player.loop,
        playing: state.audio.player.playing,
        activeIntervalID: state.audio.player.activeIntervalID,
        intervals: state.audio.player.intervals,
    }), shallowEqual);
    const latestRef = useRef({
        request, loop, playing, activeIntervalID, intervals,
    });
    latestRef.current = {
        request, loop, playing, activeIntervalID, intervals,
    };

    // Start play-once through the generic transport.
    useEffect(() => {
        if (!ready || !request) return;
        const latest = latestRef.current;
        if (!latest.intervals.some((interval) => interval.clientID === request.intervalID)) {
            dispatch(audioActions.completePlayAudioIntervalOnce(request));
            return;
        }

        const region = regionRuntime.regionsPlugin.getRegions().find(
            (item) => clientIDFromWaveRegionId(item.id) === request.intervalID,
        );
        if (!region) return;

        seek(region.start);
        play();
    }, [ready, request]);

    useEffect(() => {
        if (!ready) return undefined;

        return subscribeTimeUpdates((time: number): void => {
            const latest = latestRef.current;
            const intervalID = latest.request?.intervalID ?? (
                latest.playing && latest.loop ? latest.activeIntervalID : null
            );
            if (intervalID === null) return;

            const interval = latest.intervals.find((item) => item.clientID === intervalID);
            if (!interval || time < intervalEndSeconds(interval)) return;

            if (latest.request?.intervalID === intervalID) {
                pause();
                dispatch(audioActions.completePlayAudioIntervalOnce(latest.request));
                return;
            }

            if (latest.playing && latest.loop && latest.activeIntervalID === intervalID) {
                seek(intervalStartSeconds(interval));
            }
        });
    }, [ready]);
}
