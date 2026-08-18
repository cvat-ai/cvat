// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { audioActions } from 'actions/audio-actions';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { clamp } from 'utils/math';

import type { WaveSurferRuntime } from './use-audio-waveform';

export interface WaveformPlayback {
    /** Play audio from the current position */
    play(): void;
    /** Pause audio playback */
    pause(): void;
    /** Seek to a specific time in seconds */
    seek(time: number): void;
    getCurrentTime(): number;
    subscribeTimeUpdates(listener: (time: number) => void): () => void;
}

/**
 * Responsible for playback interactions. Exposes a stable API for the rest of the waveform hooks to use.
 */
export function useWaveformPlayback(runtime: WaveSurferRuntime): WaveformPlayback {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        playing, duration, volume, playbackRate, seekRequest,
    } = useSelector((state: CombinedState) => ({
        playing: state.audio.player.playing,
        duration: state.audio.player.duration,
        volume: state.audio.player.volume,
        playbackRate: state.audio.player.playbackRate,
        seekRequest: state.audio.player.seekRequest,
    }), shallowEqual);
    const listenersRef = useRef(new Set<(time: number) => void>());
    const { ready } = runtime;

    const play = useCallback((): void => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;
        instance.play().catch(() => {});
        dispatch(audioActions.switchAudioPlay(true));
    }, []);
    const pause = useCallback((): void => {
        runtime.instanceRef.current?.pause();
        dispatch(audioActions.switchAudioPlay(false));
    }, []);
    const seek = useCallback((time: number): void => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;
        instance.setTime(clamp(time, 0, instance.getDuration()));
    }, []);
    const getCurrentTime = useCallback((): number => runtime.instanceRef.current?.getCurrentTime() ?? 0, []);
    const subscribeTimeUpdates = useCallback((listener: (time: number) => void): (() => void) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
    }, []);

    // Sync timeupdate and finish events from the WaveSurfer instance to redux
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance) return undefined;

        const onTimeUpdate = (): void => {
            // With the WebAudio backend, a timeupdate emitted after pausing can
            // carry WaveSurfer's stale reactive time (the previous seek position).
            // See: https://github.com/katspaugh/wavesurfer.js/issues/4347
            // Its player clock remains correct, so use it as the source of truth.
            const currentTime = instance.getCurrentTime();
            dispatch(audioActions.reportAudioCurrentTime(currentTime));
            listenersRef.current.forEach((listener) => listener(currentTime));
        };
        const onFinish = (): void => {
            dispatch(audioActions.switchAudioPlay(false));
        };
        instance.on('timeupdate', onTimeUpdate);
        instance.on('finish', onFinish);
        return () => {
            instance.un('timeupdate', onTimeUpdate);
            instance.un('finish', onFinish);
        };
    }, [ready]);

    // Sync "playing" redux state with the WaveSurfer instance
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        if (playing) {
            instance.play().catch(() => {});
        } else {
            instance.pause();
        }
    }, [playing, ready]);

    // Handle seek requests from redux
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance || !seekRequest || duration <= 0) return;

        instance.setTime(clamp(seekRequest.time, 0, duration));
        dispatch(audioActions.completeAudioSeek(seekRequest));
    }, [duration, ready, seekRequest]);

    // Sync volume from redux to the WaveSurfer instance
    useEffect(() => {
        runtime.instanceRef.current?.setVolume(volume);
    }, [ready, volume]);

    // Sync playback rate from redux to the WaveSurfer instance
    useEffect(() => {
        runtime.instanceRef.current?.setPlaybackRate(playbackRate, true);
    }, [playbackRate, ready]);

    return {
        play,
        pause,
        seek,
        getCurrentTime,
        subscribeTimeUpdates,
    };
}
