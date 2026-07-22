// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useRef, useState,
} from 'react';
import { useDispatch } from 'react-redux';
import type WaveSurfer from 'wavesurfer.js';
import type { GenericPlugin } from 'wavesurfer.js/dist/base-plugin';
import type { WavesurferProps } from '@wavesurfer/react';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';

import { audioActions } from 'actions/audio-actions';
import { formatSeconds } from 'audio/utils/format-audio-time';
import { ThunkDispatch } from 'utils/redux';

import { injectScrollbarStyle } from '../utils/inject-scrollbar-style';
import { useWaveformViewport, WaveformViewport } from './use-waveform-viewport';
import { useWaveformPlayback, WaveformPlayback } from './use-waveform-playback';

export interface WaveformPlayerBindings {
    plugins: GenericPlugin[];
    onReady: NonNullable<WavesurferProps['onReady']>;
    onDestroy: NonNullable<WavesurferProps['onDestroy']>;
}

export interface WaveformRegionRuntime {
    /** Stable ref */
    regionsPlugin: RegionsPlugin;
}

export interface AudioWaveform {
    playerBindings: WaveformPlayerBindings;
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    playback: WaveformPlayback;
    durationRef: React.MutableRefObject<number>;
    ready: boolean;
    readyRef: React.MutableRefObject<boolean>;
}

export interface WaveSurferRuntime {
    /** Stable ref */
    instanceRef: React.MutableRefObject<WaveSurfer | null>;
    /** Stable ref */
    durationRef: React.MutableRefObject<number>;
    /** Stable ref */
    minimap: MinimapPlugin;
    /** Stable ref */
    playerBindings: WaveformPlayerBindings;
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
    sourceURL: string;
    minimapContainerID: string;
}

/**
 * Responsible for creating and managing the WaveSurfer instance and its plugins.
 * Exposes a stable API for the rest of the waveform hooks to use.
 */
function useWaveSurferRuntime({
    sourceURL, minimapContainerID,
}: Params): WaveSurferRuntime {
    interface WaveSurferSourceScope {
        minimap: MinimapPlugin;
        regionsPlugin: RegionsPlugin;
        playerBindings: WaveformPlayerBindings;
    }

    const dispatch = useDispatch<ThunkDispatch>();
    const [instance, setInstance] = useState<WaveSurfer | null>(null);
    const instanceRef = useRef(instance);
    instanceRef.current = instance;
    const durationRef = useRef(0);
    const readyRef = useRef(false);

    const createSourceScope = (): WaveSurferSourceScope => {
        const minimap = MinimapPlugin.create({
            container: `#${minimapContainerID}`,
            waveColor: '#9CA3AF',
            progressColor: '#3e3a3a',
            cursorColor: '#ff0000',
            cursorWidth: 2,
            height: 50,
            overlayColor: 'rgba(0, 85, 255, 0.3)',
        });
        const regions = RegionsPlugin.create();
        const plugins: GenericPlugin[] = [
            TimelinePlugin.create(),
            minimap,
            HoverPlugin.create({
                lineColor: '#C084FC',
                lineWidth: 1,
                labelColor: '#4B5563',
                labelBackground: '#ffffff',
                formatTimeCallback: formatSeconds,
            }),
            regions,
        ];

        const onReady: NonNullable<WavesurferProps['onReady']> = (readyInstance): void => {
            setInstance(readyInstance);
            injectScrollbarStyle(readyInstance.getWrapper());
            durationRef.current = readyInstance.getDuration();
            dispatch(audioActions.setAudioDuration(durationRef.current));
            readyRef.current = true;
            dispatch(audioActions.setWaveformReady(sourceURL, true));
        };
        const onDestroy: NonNullable<WavesurferProps['onDestroy']> = (): void => {
            setInstance(null);
            readyRef.current = false;
            dispatch(audioActions.setWaveformReady(sourceURL, false));
        };

        return {
            minimap,
            regionsPlugin: regions,
            playerBindings: { plugins, onReady, onDestroy },
        };
    };

    // initialized once on component mount. source url change causes
    // remount via being AudioCanvas key
    const sourceScopeRef = useRef<WaveSurferSourceScope | null>(null);
    if (sourceScopeRef.current === null) {
        sourceScopeRef.current = createSourceScope();
    }
    const sourceScope = sourceScopeRef.current;

    const regionRuntime = {
        regionsPlugin: sourceScope.regionsPlugin,
    };

    return {
        instanceRef,
        durationRef,
        minimap: sourceScope.minimap,
        playerBindings: sourceScope.playerBindings,
        regionRuntime,
        ready: instance !== null,
        readyRef,
    };
}

/**
 * Composes the source-scoped WaveSurfer runtime with generic viewport and playback capabilities.
 */
export function useAudioWaveform(params: Params): AudioWaveform {
    const runtime = useWaveSurferRuntime(params);
    const viewport = useWaveformViewport(runtime);
    const playback = useWaveformPlayback(runtime);

    return {
        playerBindings: runtime.playerBindings,
        regionRuntime: runtime.regionRuntime,
        viewport,
        playback,
        durationRef: runtime.durationRef,
        ready: runtime.ready,
        readyRef: runtime.readyRef,
    };
}
