// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import AudioRegionDetailsWrapper from 'audio/containers/annotation-page/audio-workspace/audio-region-details';
import { getCachedAudioData } from 'audio/utils/audio-data-cache';
import { CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';
import GlobalHotKeys from 'utils/mousetrap-react';

import AudioCanvasSkeleton from './skeleton/audio-canvas-skeleton';
import { useAudioWaveform } from './hooks/use-audio-waveform';
import { useAudioIntervalAnnotations } from './hooks/use-audio-interval-annotations';
import AudioWaveformControls from './audio-waveform-controls';

const minimapContainerID = 'minimap';

interface AudioCanvasProps {
    sourceToken: string;
    audioBuffer: AudioBuffer;
    peaks: Float32Array[];
    duration: number;
    waveformReady: boolean;
}

function AudioCanvas({
    sourceToken, audioBuffer, peaks, duration, waveformReady,
}: AudioCanvasProps): JSX.Element {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const waveform = useAudioWaveform({
        sourceToken,
        minimapContainerID,
        audioBuffer,
        peaks,
        duration,
        containerRef,
    });
    const annotations = useAudioIntervalAnnotations({ waveform });

    return (
        <div className='cvat-audio-canvas-wrapper'>
            <GlobalHotKeys {...annotations.navigation.shortcuts} />
            {!waveformReady && <AudioCanvasSkeleton />}
            <div
                className='cvat-audio-waveform-wrapper'
                style={!waveformReady ? { visibility: 'hidden', height: 0, overflow: 'hidden' } : undefined}
            >
                <div
                    ref={containerRef}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', overflow: 'hidden' }}
                >
                </div>
                <AudioWaveformControls
                    centerPlaybackPosition={waveform.viewport.centerPlaybackPosition}
                />
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
        audioDataToken, audioLoading, audioError, waveformReady,
    } = useSelector((state: CombinedState) => ({
        audioDataToken: state.audio.player.audioDataToken,
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

    // Redux stores an opaque token rather than decoded PCM. Resolving it here keeps
    // the AudioBuffer in ordinary runtime memory and passes the same object to WaveSurfer.
    const audioData = audioDataToken ? getCachedAudioData(audioDataToken) : null;
    if (!audioDataToken || !audioData) {
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

    // A new token denotes a new AudioBuffer. Remounting makes the effect destroy the
    // old WaveSurfer/player before binding the replacement and releases its cache entry.
    // So key is essential here as it guarantees the player and plugins lifecycle validity.
    return (
        <AudioCanvas
            key={audioDataToken}
            sourceToken={audioDataToken}
            audioBuffer={audioData.audioBuffer}
            peaks={audioData.peaks}
            duration={audioData.duration}
            waveformReady={waveformReady}
        />
    );
}

export default React.memo(AudioCanvasWrapper);
