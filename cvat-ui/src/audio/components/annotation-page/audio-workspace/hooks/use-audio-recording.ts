// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { audioActions, createAudioIntervalAsync } from 'actions/audio-actions';
import { updateActiveControl } from 'actions/annotation-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { AudioIntervalState, Source } from 'cvat-core-wrapper';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { MIN_INTERVAL_DURATION, MIN_RECORDING_DURATION } from 'audio/utils/waveform-geometry';

import { getAudioRegionColor } from '../audio-region-colors';
import { WaveformPlayback } from './use-waveform-playback';
import { RegionPreviewHandle, WaveformRegions } from './use-waveform-regions';

interface RecordingSession {
    start: number;
    labelID: number;
    preview: RegionPreviewHandle;
}

interface Params {
    playback: WaveformPlayback;
    regions: WaveformRegions;
    ready: boolean;
}

/**
 * Owns the recording preview lifecycle and persists completed recordings as audio intervals.
 */
export function useAudioRecording({ playback, regions, ready }: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const { getCurrentTime, subscribeTimeUpdates } = playback;
    const { createPreview } = regions;
    const {
        activeControl, playing, duration, labels, activeLabelID,
        colorBy, opacity, selectedOpacity,
    } = useSelector((state: CombinedState) => ({
        activeControl: state.annotation.canvas.activeControl,
        playing: state.audio.player.playing,
        duration: state.audio.player.duration,
        labels: state.annotation.job.labels,
        activeLabelID: state.audio.player.activeLabelId,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
    }), shallowEqual);
    const latestRef = useRef({
        duration, labels, activeLabelID, colorBy, opacity, selectedOpacity,
    });
    latestRef.current = {
        duration, labels, activeLabelID, colorBy, opacity, selectedOpacity,
    };
    const sessionRef = useRef<RecordingSession | null>(null);
    const wasPlayingRef = useRef(playing);

    const startSession = useCallback((): void => {
        if (sessionRef.current) return;

        const { current: latest } = latestRef;
        const label = latest.labels.find((item) => item.id === latest.activeLabelID);
        if (!label || label.id === undefined) return;

        const start = getCurrentTime();
        const interval = AudioIntervalState.create({
            label,
            start: Math.round(start * 1000),
            stop: Math.round(start * 1000),
            source: Source.MANUAL,
        });
        const initialEnd = Math.min(latest.duration, start + MIN_INTERVAL_DURATION);
        const preview = createPreview({
            range: { start, end: Math.max(start, initialEnd) },
            color: getAudioRegionColor(
                interval,
                latest.labels,
                latest.colorBy,
                latest.opacity,
                latest.selectedOpacity,
                true,
            ),
        });
        if (!preview) return;
        sessionRef.current = { start, labelID: label.id, preview };
    }, []);

    const updateSession = useCallback((time: number): void => {
        const { current: session } = sessionRef;
        if (!session || time <= session.start) return;

        session.preview.updateRange({ start: session.start, end: time });
    }, []);

    const finishSession = useCallback((): void => {
        const { current: session } = sessionRef;
        if (!session) return;

        const end = Math.max(session.start, getCurrentTime());
        session.preview.remove();
        sessionRef.current = null;
        if (end - session.start < MIN_RECORDING_DURATION) return;

        // TODO: is dropping active interval needed here?
        dispatch(audioActions.setAudioActiveInterval(null));
        dispatch(createAudioIntervalAsync(session.start, end, session.labelID));
    }, []);

    const cancelSession = useCallback((): void => {
        const { current: session } = sessionRef;
        if (!session) return;
        session.preview.remove();
        sessionRef.current = null;
    }, []);

    // start recording when record mode is selected and finish when mode is changed
    useEffect(() => {
        if (!ready) return;

        // effectively only updates when activeControl changes
        // as ready transitions only once
        if (activeControl === ActiveControl.AUDIO_REGION_RECORD) {
            startSession();
        } else {
            finishSession();
        }
    }, [activeControl, ready]);

    useEffect(() => {
        const wasPlaying = wasPlayingRef.current;
        wasPlayingRef.current = playing;
        if (wasPlaying && !playing && activeControl === ActiveControl.AUDIO_REGION_RECORD) {
            dispatch(updateActiveControl(ActiveControl.CURSOR));
        }
    }, [activeControl, playing]);

    // update preview region along with playback time updates
    useEffect(() => subscribeTimeUpdates(updateSession), []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') cancelSession();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, []);

    useEffect(() => () => cancelSession(), [ready]);
}
