// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useEffect, useRef, useState,
} from 'react';
import { useDispatch } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import type { GenericPlugin } from 'wavesurfer.js/dist/base-plugin';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';

import { audioActions, releaseAudioDataAsync } from 'actions/audio-actions';
import { formatSeconds } from 'audio/utils/format-audio-time';
import { MINIMAP_TIMELINE_HEIGHT } from 'audio/utils/waveform-geometry';
import { ThunkDispatch } from 'utils/redux';

import { injectScrollbarStyle } from '../utils/inject-scrollbar-style';
import { useWaveformViewport, WaveformViewport } from './use-waveform-viewport';
import { useWaveformPlayback, WaveformPlayback } from './use-waveform-playback';
import { useAdaptiveTimeline } from './use-adaptive-timeline';

export interface WaveformRegionRuntime {
    /** Stable ref */
    regionsPlugin: RegionsPlugin;
}

export interface AudioWaveform {
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    playback: WaveformPlayback;
    durationRef: React.MutableRefObject<number>;
    ready: boolean;
    readyRef: React.MutableRefObject<boolean>;
}

interface MinimapRuntime {
    /** Stable ref */
    plugin: MinimapPlugin;
    /** Stable ref */
    instanceRef: React.MutableRefObject<WaveSurfer | null>;
    /** Stable ref */
    timelineRef: React.MutableRefObject<TimelinePlugin | null>;
}

export interface WaveSurferRuntime {
    /** Stable ref */
    instanceRef: React.MutableRefObject<WaveSurfer | null>;
    /** Stable ref */
    durationRef: React.MutableRefObject<number>;
    minimap: MinimapRuntime;
    /** Stable ref */
    timelineRef: React.MutableRefObject<TimelinePlugin | null>;
    regionRuntime: WaveformRegionRuntime;
    /**
     * Reactive flag showing when all runtime resources are ready.
     * Hint: use as a dependency if you need to access runtime resources
     * in synchronous part of an effect.
     */
    ready: boolean;
    /** Stable ref */
    readyRef: React.MutableRefObject<boolean>;
}

interface Params {
    sourceToken: string;
    minimapContainerID: string;
    audioBuffer: AudioBuffer;
    peaks: Float32Array[];
    duration: number;
    containerRef: React.RefObject<HTMLDivElement>;
}

interface WaveSurferWebAudioPlayer {
    // WaveSurfer's WebAudio player holds the decoded source in this internal field.
    // It is intentionally typed locally because this is private-API binding,
    // not a public WaveSurfer API contract.
    buffer: AudioBuffer | null;
    emit(eventName: 'loadedmetadata' | 'canplay'): void;
}

interface MinimapPluginInternals {
    // WaveSurfer's minimap owns an internal WaveSurfer instance for the unzoomed overview.
    miniWavesurfer: WaveSurfer | null;
}

/**
 * Responsible for creating and managing the WaveSurfer instance and its plugins.
 * Exposes a stable API for the rest of the waveform hooks to use.
 */
function useWaveSurferRuntime({
    sourceToken, minimapContainerID, audioBuffer, peaks, duration, containerRef,
}: Params): WaveSurferRuntime {
    interface WaveSurferPluginScope {
        minimap: MinimapPlugin;
        regionsPlugin: RegionsPlugin;
        plugins: GenericPlugin[];
        destroy(): void;
    }

    const dispatch = useDispatch<ThunkDispatch>();
    const [instance, setInstance] = useState<WaveSurfer | null>(null);
    const minimapInstanceRef = useRef<WaveSurfer | null>(null);
    const instanceRef = useRef(instance);
    instanceRef.current = instance;
    const durationRef = useRef(0);
    const readyRef = useRef(false);
    const timelineRef = useRef<TimelinePlugin | null>(null);
    const minimapTimelineRef = useRef<TimelinePlugin | null>(null);

    const createPlugins = (): WaveSurferPluginScope => {
        const minimap = MinimapPlugin.create({
            container: `#${minimapContainerID}`,
            waveColor: '#9CA3AF',
            progressColor: '#3e3a3a',
            cursorColor: '#ff0000',
            cursorWidth: 2,
            height: 50,
            overlayColor: 'rgba(0, 85, 255, 0.3)',
        });
        const timeline = TimelinePlugin.create();
        timelineRef.current = timeline;
        const unsubscribeMinimapInit = minimap.on('init', () => {
            const { miniWavesurfer } = minimap as unknown as MinimapPluginInternals;
            if (!miniWavesurfer) return;

            const minimapTimeline = TimelinePlugin.create({
                height: MINIMAP_TIMELINE_HEIGHT,
            });
            minimapTimelineRef.current = minimapTimeline;
            miniWavesurfer.registerPlugin(minimapTimeline);
            minimapInstanceRef.current = miniWavesurfer;
        });
        const regionsPlugin = RegionsPlugin.create();
        const plugins: GenericPlugin[] = [
            timeline,
            minimap,
            HoverPlugin.create({
                lineColor: '#C084FC',
                lineWidth: 1,
                labelColor: '#4B5563',
                labelBackground: '#ffffff',
                formatTimeCallback: formatSeconds,
            }),
            regionsPlugin,
        ];

        return {
            minimap,
            regionsPlugin,
            plugins,
            destroy: unsubscribeMinimapInit,
        };
    };

    const pluginsScopeRef = useRef<WaveSurferPluginScope | null>(null);
    if (!pluginsScopeRef.current) {
        pluginsScopeRef.current = createPlugins();
    }
    const pluginsScope = pluginsScopeRef.current;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            throw new Error('Cannot initialize the audio waveform without its container element');
        }

        const wsInstance = WaveSurfer.create({
            container,
            backend: 'WebAudio',
            autoScroll: true,
            autoCenter: false,
            peaks,
            duration,
            height: 140,
            waveColor: '#4F46E5',
            progressColor: '#818CF8',
            cursorColor: '#C084FC',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 2,
            plugins: pluginsScope.plugins,
        });

        // WaveSurfer has no public API for passing an already-decoded AudioBuffer.
        // Initialize its WebAudioPlayer before WaveSurfer starts loading the supplied
        // peaks and duration. This mirrors the player.src initialization path: it
        // installs the buffer and emits the metadata/readiness events that update
        // WaveSurfer's internal player state.
        const unsubscribeInit = wsInstance.on('init', () => {
            const player = wsInstance.getMediaElement() as unknown as WaveSurferWebAudioPlayer;
            player.buffer = audioBuffer;
            player.emit('loadedmetadata');
            player.emit('canplay');
        });

        const unsubscribeReady = wsInstance.on('ready', () => {
            setInstance(wsInstance);
            injectScrollbarStyle(wsInstance.getWrapper());
            durationRef.current = wsInstance.getDuration();
            dispatch(audioActions.setAudioDuration(durationRef.current));
            dispatch(audioActions.setWaveformReady(sourceToken, true));
            readyRef.current = true;
        });

        return () => {
            unsubscribeInit();
            unsubscribeReady();
            setInstance(null);
            minimapInstanceRef.current = null;
            readyRef.current = false;
            dispatch(releaseAudioDataAsync(sourceToken));
            pluginsScope.destroy();
            wsInstance.destroy();
        };
    }, []);

    return {
        instanceRef,
        durationRef,
        minimap: {
            plugin: pluginsScope.minimap,
            instanceRef: minimapInstanceRef,
            timelineRef: minimapTimelineRef,
        },
        timelineRef,
        regionRuntime: { regionsPlugin: pluginsScope.regionsPlugin },
        ready: instance !== null,
        readyRef,
    };
}

/**
 * Composes the source-scoped WaveSurfer runtime with generic viewport and playback capabilities.
 */
export function useAudioWaveform(params: Params): AudioWaveform {
    const runtime = useWaveSurferRuntime(params);
    const viewport = useWaveformViewport(runtime, params.containerRef);
    useAdaptiveTimeline(runtime, viewport.pixelsPerSecond, viewport.overviewPixelsPerSecond);
    const playback = useWaveformPlayback(runtime);

    return {
        regionRuntime: runtime.regionRuntime,
        viewport,
        playback,
        durationRef: runtime.durationRef,
        ready: runtime.ready,
        readyRef: runtime.readyRef,
    };
}
