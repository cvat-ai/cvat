import React, {
    useRef, useState, useEffect, useCallback,
} from 'react';
import WaveSurfer from 'wavesurfer.js';
import WavesurferPlayer from '@wavesurfer/react';
import Spin from 'antd/lib/spin';

import { ActiveControl, AudioRegion, ColorBy } from 'reducers';
import { Attribute, Label } from 'cvat-core-wrapper';

import AudioRegionDetails from './audio-region-details';
import { useAudioWaveform } from './hooks/use-audio-waveform';
import { useAudioPlaybackSync } from './hooks/use-audio-playback-sync';
import { useAudioRegions } from './hooks/use-audio-regions';

export interface AudioCanvasWrapperProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
    volume: number;
    loop: boolean;
    playbackRate: number;
    activeControl: ActiveControl;
    regions: AudioRegion[];
    activeRegionId: string | null;
    hoveredRegionId: string | null;
    audioUrl: string | null;
    audioLoading: boolean;
    audioError: string | null;
    waveformReady: boolean;
    labels: Label[];
    activeLabelId: number | null;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onSetDuration(duration: number): void;
    onSetRegions(regions: AudioRegion[]): void;
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onUpdateRegionAttribute(regionId: string, attrID: number, value: string): void;
    onWaveformReady(ready: boolean): void;
    onUpdateActiveControl(activeControl: ActiveControl): void;
}

function AudioCanvasWrapper(props: AudioCanvasWrapperProps): JSX.Element {
    const {
        isPlaying, currentTime, duration, zoom, volume, loop, playbackRate,
        activeControl, regions, activeRegionId, hoveredRegionId,
        audioUrl, audioLoading, audioError, waveformReady,
        labels, activeLabelId, colorBy, opacity, selectedOpacity,
        onSwitchPlay, onSetCurrentTime, onSetDuration,
        onSetRegions, onSetActiveRegion, onSetHoveredRegion,
        onUpdateRegionAttribute, onWaveformReady, onUpdateActiveControl,
    } = props;

    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const prevAudioUrlRef = useRef<string | null>(null);

    const { plugins, regionsPluginRef } = useAudioWaveform(wavesurfer, zoom);

    const { lastWsTimeRef } = useAudioPlaybackSync({
        wavesurfer, isPlaying, currentTime, duration, zoom, volume, playbackRate,
    });

    const { handleReady, handleFinish, handleTimeupdate } = useAudioRegions({
        regionsPluginRef,
        wavesurfer,
        lastWsTimeRef,
        activeControl,
        regions,
        activeRegionId,
        hoveredRegionId,
        labels,
        activeLabelId,
        colorBy,
        opacity,
        selectedOpacity,
        loop,
        onSwitchPlay,
        onSetCurrentTime,
        onSetDuration,
        onSetRegions,
        onSetActiveRegion,
        onSetHoveredRegion,
        onUpdateActiveControl,
        onWaveformReady,
        onWavesurferReady: setWavesurfer,
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

    const activeRegion = activeRegionId ?
        regions.find((r) => r.id === activeRegionId) : null;

    const deleteActiveRegion = useCallback((): void => {
        if (!activeRegionId) return;
        onSetRegions(regions.filter((r) => r.id !== activeRegionId));
        onSetActiveRegion(null);
    }, [activeRegionId, regions, onSetRegions, onSetActiveRegion]);

    const changeAttribute = useCallback((attrID: number, value: string): void => {
        if (!activeRegionId) return;
        onUpdateRegionAttribute(activeRegionId, attrID, value);
    }, [activeRegionId, onUpdateRegionAttribute]);

    const changeLabel = useCallback((labelId: number): void => {
        if (!activeRegion) return;
        const label = labels.find((l) => l.id === labelId);
        const defaultAttrs: Record<number, string> = {};
        if (label) {
            label.attributes.forEach((attr: Attribute) => {
                defaultAttrs[attr.id!] = attr.defaultValue;
            });
        }
        onSetRegions(
            regions.map((r) => (r.id === activeRegion.id ? {
                ...r,
                labelId,
                attributes: defaultAttrs,
                color: label?.color,
            } : r)),
        );
    }, [activeRegion, labels, regions, onSetRegions]);

    if (audioLoading) {
        return (
            <div className='cvat-audio-canvas-wrapper'>
                <div className='cvat-audio-placeholder'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            </div>
        );
    }

    if (audioError) {
        return (
            <div className='cvat-audio-canvas-wrapper'>
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
            <div className='cvat-audio-canvas-wrapper'>
                <div className='cvat-audio-placeholder'>
                    <p className='cvat-audio-placeholder-text'>
                        No audio data available for this job.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className='cvat-audio-canvas-wrapper'>
            {!waveformReady && (
                <div className='cvat-audio-placeholder'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            )}
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
                        onPlay={() => onSwitchPlay(true)}
                        onPause={() => onSwitchPlay(false)}
                        onTimeupdate={handleTimeupdate}
                        onFinish={handleFinish}
                        plugins={plugins}
                    />
                </div>
                <div className='cvat-audio-minimap-section'>
                    <div id='minimap' />
                </div>
            </div>

            {activeRegion && (
                <AudioRegionDetails
                    region={activeRegion}
                    regionIndex={regions.indexOf(activeRegion)}
                    labels={labels}
                    onDelete={deleteActiveRegion}
                    onChangeLabel={changeLabel}
                    onChangeAttribute={changeAttribute}
                />
            )}
        </div>
    );
}

export default React.memo(AudioCanvasWrapper);
