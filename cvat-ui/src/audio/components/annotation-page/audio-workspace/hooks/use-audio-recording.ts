// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { createAudioIntervalAsync } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { usePrevious } from 'utils/hooks';
import { MIN_INTERVAL_DURATION, MIN_RECORDING_DURATION } from 'audio/utils/waveform-geometry';

import { getAudioLabelPreviewColor } from '../audio-region-colors';
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
        selectedOpacity,
    } = useSelector((state: CombinedState) => ({
        activeControl: state.annotation.canvas.activeControl,
        playing: state.audio.player.playing,
        duration: state.audio.player.duration,
        labels: state.annotation.job.labels,
        activeLabelID: state.audio.player.activeLabelId,
        selectedOpacity: state.settings.shapes.selectedOpacity,
    }), shallowEqual);
    const latestRef = useRef({
        duration, labels, activeLabelID, selectedOpacity,
    });
    latestRef.current = {
        duration, labels, activeLabelID, selectedOpacity,
    };
    const sessionRef = useRef<RecordingSession | null>(null);
    const prevPlaying = usePrevious(playing);

    const startSession = useCallback((): void => {
        if (sessionRef.current) return;

        const { current: latest } = latestRef;
        const label = latest.labels.find((item) => item.id === latest.activeLabelID);
        if (!label || label.id === undefined) return;

        const start = getCurrentTime();
        const initialEnd = Math.min(latest.duration, start + MIN_INTERVAL_DURATION);
        const preview = createPreview({
            range: { start, end: Math.max(start, initialEnd) },
            color: getAudioLabelPreviewColor(
                label.id,
                latest.labels,
                latest.selectedOpacity,
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

    // apply label color to the preview when active label changes during recording
    useEffect(() => {
        if (activeControl !== ActiveControl.AUDIO_REGION_RECORD || activeLabelID === null) return;

        const { current: session } = sessionRef;
        if (!session || session.labelID === activeLabelID) return;

        const { current: latest } = latestRef;
        session.labelID = activeLabelID;
        session.preview.updateColor(getAudioLabelPreviewColor(
            activeLabelID,
            latest.labels,
            latest.selectedOpacity,
        ));
    }, [activeControl, activeLabelID]);

    useEffect(() => {
        if (activeControl !== ActiveControl.AUDIO_REGION_RECORD) return;

        if (prevPlaying && !playing) {
            finishSession();
        }
    }, [activeControl, playing, prevPlaying]);

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
