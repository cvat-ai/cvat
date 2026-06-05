// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useRef, useState, useEffect, useCallback, useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import WavesurferPlayer from '@wavesurfer/react';

import { ActiveControl, CombinedState } from 'reducers';
import { Attribute } from 'cvat-core-wrapper';
import { shallowEqual } from 'utils/redux';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import {
    audioActions,
    createAudioIntervalAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import { updateActiveControl } from 'actions/annotation-actions';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';

import AudioRegionDetails from './audio-region-details';
import AudioCanvasSkeleton from './skeleton/audio-canvas-skeleton';
import { useAudioWaveform } from './hooks/use-audio-waveform';
import { useAudioPlaybackSync } from './hooks/use-audio-playback-sync';
import { useAudioRegions } from './hooks/use-audio-regions';
import { useAudioRecording } from './hooks/use-audio-recording';
import { filterAudioIntervals } from './utils/filter-audio-regions';
import { ZOOM_MAX, ZOOM_MIN, computeWaveformZoom } from './utils/zoom-bounds';
import { intervalID } from './utils/audio-interval';

const ZOOM_STEP_FACTOR = 1.2;

const componentShortcuts = {
    NEXT_OBJECT: {
        name: 'Next object',
        description: 'Go to the next audio interval and center it on the waveform',
        sequences: ['tab'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
    PREVIOUS_OBJECT: {
        name: 'Previous object',
        description: 'Go to the previous audio interval and center it on the waveform',
        sequences: ['shift+tab'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
};

registerComponentShortcuts(componentShortcuts);

function AudioCanvasWrapper(): JSX.Element {
    const dispatch = useDispatch();
    const {
        isPlaying, currentTime, duration, zoom, volume, loop, playbackRate,
        jobInstance, activeControl, intervals, activeIntervalID, hoveredIntervalID,
        audioUrl, audioLoading, audioError, waveformReady,
        labels, activeLabelId, colorBy, opacity, selectedOpacity,
        filters, keyMap,
    } = useSelector((state: CombinedState) => ({
        isPlaying: state.audio.player.playing,
        currentTime: state.audio.player.currentTime,
        duration: state.audio.player.duration,
        zoom: state.audio.player.zoom,
        volume: state.audio.player.volume,
        loop: state.audio.player.loop,
        playbackRate: state.audio.player.playbackRate,
        jobInstance: state.annotation.job.instance,
        activeControl: state.annotation.canvas.activeControl,
        intervals: state.audio.player.intervals,
        activeIntervalID: state.audio.player.activeIntervalID,
        hoveredIntervalID: state.audio.player.hoveredIntervalID,
        audioUrl: state.audio.player.audioUrl,
        audioLoading: state.audio.player.audioLoading,
        audioError: state.audio.player.audioError,
        waveformReady: state.audio.player.waveformReady,
        labels: state.annotation.job.labels,
        activeLabelId: state.audio.player.activeLabelId,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
        filters: state.annotation.annotations.filters,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);

    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [waveformWidth, setWaveformWidth] = useState(0);
    const prevAudioUrlRef = useRef<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef(zoom);
    const waveformZoom = useMemo(
        () => computeWaveformZoom(zoom, duration, waveformWidth),
        [duration, waveformWidth, zoom],
    );
    const phantomRegionIdsRef = useRef<Set<string>>(new Set());
    const visibleIntervalIds = useMemo(() => (
        new Set(filterAudioIntervals(intervals, labels, filters).map((interval) => intervalID(interval)))
    ), [intervals, labels, filters]);
    const visibleIntervals = useMemo(() => (
        intervals.filter((interval) => !interval.hidden && visibleIntervalIds.has(intervalID(interval)))
    ), [intervals, visibleIntervalIds]);
    const onSwitchPlay = useCallback((playing: boolean): void => {
        dispatch(audioActions.switchAudioPlay(playing));
    }, [dispatch]);
    const onSetCurrentTime = useCallback((time: number): void => {
        dispatch(audioActions.setAudioCurrentTime(time));
    }, [dispatch]);
    const onSetDuration = useCallback((nextDuration: number): void => {
        dispatch(audioActions.setAudioDuration(nextDuration));
    }, [dispatch]);
    const onSetActiveInterval = useCallback((clientID: number | null): void => {
        dispatch(audioActions.setAudioActiveInterval(clientID));
    }, [dispatch]);
    const onSetHoveredInterval = useCallback((clientID: number | null): void => {
        dispatch(audioActions.setAudioHoveredInterval(clientID));
    }, [dispatch]);
    const onSetZoom = useCallback((nextZoom: number): void => {
        dispatch(audioActions.setAudioZoom(nextZoom));
    }, [dispatch]);
    const onCreateInterval = useCallback((start: number, stop: number, labelID: number | null): void => {
        dispatch(createAudioIntervalAsync(start, stop, labelID));
    }, [dispatch]);
    const onUpdateIntervalPosition = useCallback((clientID: number, start: number, stop: number): void => {
        dispatch(updateAudioIntervalAsync(clientID, {
            start: Math.round(start * 1000),
            stop: Math.round(stop * 1000),
        }));
    }, [dispatch]);
    const onUpdateIntervalAttribute = useCallback((clientID: number, attrID: number, value: string): void => {
        dispatch(updateAudioIntervalAsync(clientID, {
            attributes: { [attrID]: value },
        }));
    }, [dispatch]);
    const onWaveformReady = useCallback((ready: boolean): void => {
        dispatch(audioActions.setWaveformReady(ready));
    }, [dispatch]);
    const onUpdateActiveControl = useCallback((control: ActiveControl): void => {
        dispatch(updateActiveControl(control));
    }, [dispatch]);

    const centerViewportOnInterval = useCallback((clientID: number): void => {
        if (!wavesurfer) return;
        const interval = intervals.find((_interval) => _interval.clientID === clientID);
        if (!interval) return;
        const audioDuration = wavesurfer.getDuration();
        if (!audioDuration) return;
        const scrollContainer = wavesurfer.getWrapper()?.parentElement;
        if (!scrollContainer) return;
        const totalWidth = scrollContainer.scrollWidth;
        const visibleWidth = wavesurfer.getWidth();
        if (totalWidth <= visibleWidth) return;

        const startPx = ((interval.start / 1000) / audioDuration) * totalWidth;
        const endPx = (((interval.stop ?? interval.start) / 1000) / audioDuration) * totalWidth;
        const midPx = (startPx + endPx) / 2;
        wavesurfer.setScroll(Math.max(
            0,
            Math.min(totalWidth - visibleWidth, midPx - visibleWidth / 2),
        ));
    }, [intervals, wavesurfer]);

    const navigateInterval = useCallback((step: number): void => {
        if (
            activeControl === ActiveControl.AUDIO_REGION_CREATE ||
            activeControl === ActiveControl.AUDIO_REGION_RECORD
        ) {
            return;
        }
        if (!visibleIntervals.length) return;
        const currentIndex = visibleIntervals.findIndex((interval) => interval.clientID === activeIntervalID);
        let nextIndex = currentIndex + step;
        if (nextIndex > visibleIntervals.length - 1) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = visibleIntervals.length - 1;
        }

        const nextInterval = visibleIntervals[nextIndex];
        if (nextInterval?.clientID !== null && nextInterval?.clientID !== activeIntervalID) {
            onSetActiveInterval(nextInterval.clientID);
            centerViewportOnInterval(nextInterval.clientID);
        }
    }, [activeControl, activeIntervalID, centerViewportOnInterval, onSetActiveInterval, visibleIntervals]);

    const hotkeyHandlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        NEXT_OBJECT: (event?: KeyboardEvent) => {
            event?.preventDefault();
            navigateInterval(1);
        },
        PREVIOUS_OBJECT: (event?: KeyboardEvent) => {
            event?.preventDefault();
            navigateInterval(-1);
        },
    };

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    useEffect(() => {
        const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
        if (nextZoom !== zoom) onSetZoom(nextZoom);
    }, [onSetZoom, zoom]);

    useEffect(() => {
        const el = wrapperRef.current?.querySelector('.cvat-audio-waveform-wrapper') as HTMLElement | null;
        if (!el) return undefined;

        const updateWaveformWidth = (): void => {
            setWaveformWidth(el.clientWidth);
        };

        updateWaveformWidth();
        const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(updateWaveformWidth) : null;
        ro?.observe(el);

        return () => {
            ro?.disconnect();
        };
    }, [audioUrl, waveformReady]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return undefined;
        const onWheel = (e: WheelEvent): void => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const zoomingIn = e.deltaY < 0;
            const factor = zoomingIn ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR;
            const target = zoomRef.current * factor;
            let next = zoomingIn ? Math.ceil(target) : Math.floor(target);
            if (next === zoomRef.current) {
                next = zoomRef.current + (zoomingIn ? 1 : -1);
            }
            next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
            if (next !== zoomRef.current) {
                onSetZoom(next);
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheel);
        };
    }, [onSetZoom]);

    const { plugins, regionsPluginRef } = useAudioWaveform(wavesurfer, zoom);

    const { lastWsTimeRef } = useAudioPlaybackSync({
        wavesurfer, isPlaying, currentTime, duration, zoom: waveformZoom, volume, playbackRate,
    });

    const { handleReady, handleFinish, handleTimeupdate } = useAudioRegions({
        jobInstance,
        regionsPluginRef,
        wavesurfer,
        lastWsTimeRef,
        phantomRegionIdsRef,
        activeControl,
        intervals,
        visibleIntervalIds,
        activeIntervalID,
        hoveredIntervalID,
        labels,
        activeLabelId,
        colorBy,
        opacity,
        selectedOpacity,
        loop,
        onSwitchPlay,
        onSetCurrentTime,
        onSetDuration,
        onCreateInterval,
        onUpdateIntervalPosition,
        onSetActiveInterval,
        onSetHoveredInterval,
        onWaveformReady,
        onWavesurferReady: setWavesurfer,
    });

    useAudioRecording({
        regionsPluginRef,
        wavesurfer,
        activeControl,
        isPlaying,
        intervals,
        labels,
        activeLabelId,
        colorBy,
        opacity,
        selectedOpacity,
        phantomRegionIdsRef,
        onCreateInterval,
        onSetActiveInterval,
        onUpdateActiveControl,
    });

    useEffect(() => {
        if (prevAudioUrlRef.current && prevAudioUrlRef.current !== audioUrl) {
            URL.revokeObjectURL(prevAudioUrlRef.current);
        }
        prevAudioUrlRef.current = audioUrl;

        return () => {
            if (prevAudioUrlRef.current) {
                URL.revokeObjectURL(prevAudioUrlRef.current);
            }
        };
    }, [audioUrl]);

    const activeInterval = activeIntervalID !== null ?
        intervals.find((interval) => interval.clientID === activeIntervalID) : null;

    const changeAttribute = useCallback((attrID: number, value: string): void => {
        if (activeIntervalID === null) return;
        onUpdateIntervalAttribute(activeIntervalID, attrID, value);
    }, [activeIntervalID, onUpdateIntervalAttribute]);

    const changeLabel = useCallback((labelId: number): void => {
        if (!activeInterval) return;
        const label = labels.find((l) => l.id === labelId);
        if (!label || activeInterval.clientID === null) return;
        const defaultAttrs: Record<number, string> = {};
        label.attributes.forEach((attr: Attribute) => {
            defaultAttrs[attr.id!] = attr.defaultValue;
        });
        dispatch(updateAudioIntervalAsync(activeInterval.clientID, {
            label,
            attributes: defaultAttrs,
        }));
    }, [activeInterval, labels, dispatch]);

    if (audioLoading) {
        return (
            <div className='cvat-audio-canvas-wrapper' ref={wrapperRef}>
                <AudioCanvasSkeleton />
            </div>
        );
    }

    if (audioError) {
        return (
            <div className='cvat-audio-canvas-wrapper' ref={wrapperRef}>
                <div className='cvat-audio-placeholder'>
                    <p className='cvat-audio-placeholder-text'>
                        {`Failed to load audio: ${audioError}`}
                    </p>
                </div>
            </div>
        );
    }

    if (!audioUrl) {
        return (
            <div className='cvat-audio-canvas-wrapper' ref={wrapperRef}>
                <div className='cvat-audio-placeholder'>
                    <p className='cvat-audio-placeholder-text'>
                        No audio data available for this job.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className='cvat-audio-canvas-wrapper' ref={wrapperRef}>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={hotkeyHandlers} />
            {!waveformReady && <AudioCanvasSkeleton />}
            <div className='cvat-audio-waveform-wrapper' style={!waveformReady ? { visibility: 'hidden', height: 0, overflow: 'hidden' } : undefined}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', overflow: 'hidden' }}>
                    <WavesurferPlayer
                        key={audioUrl}
                        onReady={handleReady}
                        url={audioUrl}
                        height={140}
                        waveColor='#4F46E5'
                        progressColor='#818CF8'
                        cursorColor='#C084FC'
                        barWidth={2}
                        barRadius={3}
                        cursorWidth={2}
                        normalize
                        onTimeupdate={handleTimeupdate}
                        onFinish={handleFinish}
                        plugins={plugins}
                    />
                </div>
                <div className='cvat-audio-minimap-section'>
                    <div id='minimap' />
                </div>
            </div>

            {activeInterval && (
                <AudioRegionDetails
                    interval={activeInterval}
                    intervalIndex={intervals.indexOf(activeInterval)}
                    labels={labels}
                    onChangeLabel={changeLabel}
                    onChangeAttribute={changeAttribute}
                />
            )}
        </div>
    );
}

export default React.memo(AudioCanvasWrapper);
