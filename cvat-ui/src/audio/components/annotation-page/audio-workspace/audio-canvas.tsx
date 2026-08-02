// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import WavesurferPlayer from '@wavesurfer/react';

import AudioRegionDetailsWrapper from 'audio/containers/annotation-page/audio-workspace/audio-region-details';
import { CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';
import GlobalHotKeys from 'utils/mousetrap-react';

import AudioCanvasSkeleton from './skeleton/audio-canvas-skeleton';
import { useAudioWaveform } from './hooks/use-audio-waveform';
import { useAudioIntervalAnnotations } from './hooks/use-audio-interval-annotations';

const minimapContainerID = 'minimap';

interface AudioCanvasProps {
    sourceURL: string;
    waveformReady: boolean;
}

function AudioCanvas({ sourceURL, waveformReady }: AudioCanvasProps): JSX.Element {
    const waveform = useAudioWaveform({
        sourceURL,
        minimapContainerID,
    });
    const annotations = useAudioIntervalAnnotations({ waveform });

    const { playerBindings } = waveform;
    return (
        <div className='cvat-audio-canvas-wrapper'>
            <GlobalHotKeys {...annotations.navigation.shortcuts} />
            {!waveformReady && <AudioCanvasSkeleton />}
            <div
                className='cvat-audio-waveform-wrapper'
                style={!waveformReady ? { visibility: 'hidden', height: 0, overflow: 'hidden' } : undefined}
            >
                <div
                    ref={waveform.viewport.containerRef}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', overflow: 'hidden' }}
                >
                    <WavesurferPlayer
                        url={sourceURL}
                        height={140}
                        waveColor='#4F46E5'
                        progressColor='#818CF8'
                        cursorColor='#C084FC'
                        barWidth={2}
                        barRadius={3}
                        cursorWidth={2}
                        plugins={playerBindings.plugins}
                        onReady={playerBindings.onReady}
                        onDestroy={playerBindings.onDestroy}
                    />
                </div>
                <div className='cvat-audio-minimap-section'>
                    <div id={minimapContainerID} />
                </div>
            </div>
            <AudioRegionDetailsWrapper />
        </div>
    );
}

function AudioCanvasWrapper(): JSX.Element {
    const {
        audioUrl, audioLoading, audioError, waveformReady,
    } = useSelector((state: CombinedState) => ({
        audioUrl: state.audio.player.audioUrl,
        audioLoading: state.audio.player.audioLoading,
        audioError: state.audio.player.audioError,
        waveformReady: state.audio.player.waveformReady,
    }), shallowEqual);

    if (audioLoading) {
        return (
            <div className='cvat-audio-canvas-wrapper'>
                <AudioCanvasSkeleton />
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

    // key is !important here to force re-mounting of the AudioCanvas when the audioUrl changes
    // internal lifecycle of plugins and events bound to Wavesurfer runtime depends on this
    return (
        <AudioCanvas key={audioUrl} sourceURL={audioUrl} waveformReady={waveformReady} />
    );
}

export default React.memo(AudioCanvasWrapper);
