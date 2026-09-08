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
import type { AudioTimeRange } from '../utils/audio-interval';

export interface WaveformPlayback {
    /** Play audio from the current position. */
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
        playing, duration, volume, playbackRate, seekRequest, playbackRange, loop,
    } = useSelector((state: CombinedState) => ({
        playing: state.audio.player.playing,
        duration: state.audio.player.duration,
        volume: state.audio.player.volume,
        playbackRate: state.audio.player.playbackRate,
        seekRequest: state.audio.player.seekRequest,
        playbackRange: state.audio.player.playbackRange,
        loop: state.audio.player.loop,
    }), shallowEqual);
    const listenersRef = useRef(new Set<(time: number) => void>());
    const lastTimeUpdateRef = useRef<number | null>(null);
    const playbackRangeRef = useRef(playbackRange);
    const previousPlaybackRangeRef = useRef<typeof playbackRange>(null);
    const loopRef = useRef(loop);
    const playingRef = useRef(playing);
    playbackRangeRef.current = playbackRange;
    loopRef.current = loop;
    playingRef.current = playing;
    const { ready } = runtime;

    const play = useCallback((): void => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        instance.play().catch(() => {});
        dispatch(audioActions.switchAudioPlay(true));
    }, []);
    const playRange = useCallback((range: AudioTimeRange): void => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        instance.setTime(range.start);
        instance.play(undefined, range.end).catch(() => {});
        dispatch(audioActions.switchAudioPlay(true));
    }, []);
    const updateRunningPlaybackRange = useCallback((range: AudioTimeRange): void => {
        const instance = runtime.instanceRef.current;
        if (!instance || !instance.isPlaying()) return;

        instance.play(undefined, range.end).catch(() => {});
    }, []);
    const syncPlaybackRangeAfterSeek = useCallback((time: number): void => {
        const range = playbackRangeRef.current;
        if (!range) return;

        if (time < range.start || time >= range.end) {
            dispatch(audioActions.clearAudioPlaybackRange());
            return;
        }

        updateRunningPlaybackRange(range);
    }, []);

    const pause = useCallback((): void => {
        runtime.instanceRef.current?.pause();
        dispatch(audioActions.switchAudioPlay(false));
    }, []);
    const seek = useCallback((time: number): void => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        const target = clamp(time, 0, instance.getDuration());
        instance.setTime(target);
        syncPlaybackRangeAfterSeek(target);
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

        let disposed = false;
        lastTimeUpdateRef.current = null;

        const onTimeUpdate = (): void => {
            // With the WebAudio backend, a timeupdate emitted after pausing can
            // carry WaveSurfer's stale reactive time (the previous seek position).
            // See: https://github.com/katspaugh/wavesurfer.js/issues/4347
            // Its player clock remains correct, so use it as the source of truth.
            const currentTime = instance.getCurrentTime();
            // The minimap subscribes to the stale timeupdate payload directly, so
            // restore its progress from the player clock as well.
            runtime.minimap.instanceRef.current?.setTime(currentTime);

            if (lastTimeUpdateRef.current === currentTime) return;
            lastTimeUpdateRef.current = currentTime;

            dispatch(audioActions.reportAudioCurrentTime(currentTime));
            listenersRef.current.forEach((listener) => listener(currentTime));
        };
        const handleRangeEnd = (): void => {
            const range = playbackRangeRef.current;
            if (!range || instance.getCurrentTime() < range.end) return;

            if (playingRef.current && loopRef.current) {
                Promise.resolve().then(() => {
                    const activeRange = playbackRangeRef.current;
                    if (
                        disposed ||
                        !playingRef.current ||
                        !loopRef.current ||
                        !activeRange ||
                        activeRange.start !== range.start ||
                        activeRange.end !== range.end
                    ) {
                        return;
                    }

                    playRange(activeRange);
                });
            } else {
                // Without it the stop position is not accurate even when it's playing
                // a range with WebAudio backend. Audio stop must be accurate with it though
                // so we just fix the displayed position here to look precise as well.
                instance.setTime(range.end);
                dispatch(audioActions.clearAudioPlaybackRange());
                dispatch(audioActions.switchAudioPlay(false));
            }
        };
        const onFinish = (): void => {
            if (!playbackRangeRef.current) {
                dispatch(audioActions.switchAudioPlay(false));
                return;
            }

            handleRangeEnd();
        };
        const onPause = (): void => {
            handleRangeEnd();
        };
        instance.on('timeupdate', onTimeUpdate);
        instance.on('finish', onFinish);
        instance.on('pause', onPause);
        return () => {
            disposed = true;
            instance.un('timeupdate', onTimeUpdate);
            instance.un('finish', onFinish);
            instance.un('pause', onPause);
        };
    }, [ready]);

    // WaveSurfer seeks directly on waveform clicks, bypassing Redux.
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance) return undefined;

        const handleWaveformSeek = (): void => {
            syncPlaybackRangeAfterSeek(instance.getCurrentTime());
        };
        const unsubscribeMainClick = instance.on('click', handleWaveformSeek);
        const unsubscribeMinimapClick = runtime.minimap.plugin.on('click', handleWaveformSeek);

        return () => {
            unsubscribeMainClick();
            unsubscribeMinimapClick();
        };
    }, [ready]);

    // Sync "playing" redux state with the WaveSurfer instance
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        if (playing) {
            if (instance.isPlaying()) return;

            instance.play(undefined, playbackRangeRef.current?.end).catch(() => {});
        } else {
            instance.pause();
        }
    }, [playing, ready]);

    // Synchronize playback-range changes with WaveSurfer.
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance) return;

        const previousPlaybackRange = previousPlaybackRangeRef.current;
        previousPlaybackRangeRef.current = playbackRange;

        if (!playbackRange) {
            if (previousPlaybackRange && instance.isPlaying()) {
                instance.pause();
                dispatch(audioActions.switchAudioPlay(false));
            }
            return;
        }

        if (!playingRef.current) return;

        if (!previousPlaybackRange || previousPlaybackRange.id !== playbackRange.id) {
            playRange(playbackRange);
            return;
        }

        updateRunningPlaybackRange(playbackRange);
    }, [playbackRange, ready]);

    // Handle seek requests from redux
    useEffect(() => {
        const instance = runtime.instanceRef.current;
        if (!instance || !seekRequest || duration <= 0) return;

        const target = clamp(seekRequest.time, 0, duration);
        instance.setTime(target);
        syncPlaybackRangeAfterSeek(target);

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
