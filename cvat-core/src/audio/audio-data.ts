// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ChunkQuality } from 'cvat-data';
import serverProxy from '../server-proxy';

const PEAKS_SAMPLE_RATE = 8000;

export interface AssembledAudioData {
    /** original sample rate PCM audio buffer for playback */
    audioBuffer: AudioBuffer;
    /** resampled peaks to display waveform */
    peaks: Float32Array[];
    /** track duration, corresponds to audioBuffer.duration */
    duration: number;
}

async function prepareWaveformData(audioBuffer: AudioBuffer): Promise<AssembledAudioData> {
    let peaksBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== PEAKS_SAMPLE_RATE) {
        const context = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            Math.round(audioBuffer.duration * PEAKS_SAMPLE_RATE),
            PEAKS_SAMPLE_RATE,
        );
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start();
        peaksBuffer = await context.startRendering();
    }

    return {
        audioBuffer,
        peaks: Array.from(
            { length: peaksBuffer.numberOfChannels },
            (_, channel) => peaksBuffer.getChannelData(channel),
        ),
        duration: audioBuffer.duration,
    };
}

export async function fetchAndAssembleAudio(
    jobId: number,
    totalFrames: number,
    chunkSize: number,
    quality: ChunkQuality = ChunkQuality.COMPRESSED,
): Promise<AssembledAudioData> {
    const chunkCount = Math.ceil(totalFrames / chunkSize);

    const audioContext = new AudioContext();
    try {
        const rawChunks = await Promise.all(
            Array.from({ length: chunkCount }, (_, index) => (
                serverProxy.frames.getAudioChunk(jobId, index, quality)
            )),
        );
        let output: AudioBuffer | null = null;
        let sampleRate = 0;
        let numberOfChannels = 0;
        let totalContentSamples = 0;
        let writePos = 0;

        for (let i = 0; i < chunkCount; i++) {
            const rawChunk = rawChunks[i];
            rawChunks[i] = null;
            const { data, contentOffset } = rawChunk;
            const buffer = await audioContext.decodeAudioData(data);

            if (i === 0) {
                sampleRate = buffer.sampleRate;
                numberOfChannels = buffer.numberOfChannels;
                totalContentSamples = Math.round((totalFrames / 1000) * sampleRate);
            }

            const startSample = Math.round((contentOffset / 1000) * sampleRate);
            const isLastChunk = i === chunkCount - 1;
            const contentMs = isLastChunk ?
                totalFrames - i * chunkSize :
                chunkSize;
            const contentSamples = Math.min(
                Math.round((contentMs / 1000) * sampleRate),
                buffer.length - startSample,
                totalContentSamples - writePos,
            );

            if (
                chunkCount === 1 &&
                startSample === 0 &&
                contentSamples === totalContentSamples &&
                buffer.length === totalContentSamples
            ) {
                return prepareWaveformData(buffer);
            }

            if (!output) {
                output = audioContext.createBuffer(numberOfChannels, totalContentSamples, sampleRate);
            }

            if (contentSamples > 0) {
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    output.getChannelData(ch).set(
                        buffer.getChannelData(ch).subarray(startSample, startSample + contentSamples),
                        writePos,
                    );
                }
                writePos += contentSamples;
            }
            // buffer is scoped to this iteration, so its PCM can be reclaimed before the next decode.
        }

        if (!output) {
            throw new Error('Audio job has no chunks to decode');
        }
        return prepareWaveformData(output);
    } finally {
        await audioContext.close();
    }
}
