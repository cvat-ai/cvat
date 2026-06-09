// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ChunkQuality } from 'cvat-data';
import serverProxy from '../server-proxy';

// Fetches the audio chunks for a job, decodes them to PCM and concatenates
// them into a single AudioBuffer. Decoding is native (Web Audio
// decodeAudioData) and concatenation is a typed-array copy, so there is no
// per-sample work and no re-encoding step.
//
// The decoded buffer is fed straight to the player's WebAudio backend, whose
// duration comes from the decoded data (exact). This keeps the rendered
// waveform aligned with playback, even for VBR streams whose container
// duration the browser can only estimate.
//
// The caller owns `audioContext` and is responsible for its lifecycle: the
// returned AudioBuffer is used for playback, so the context must stay open.
export async function fetchAndAssembleAudio(
    audioContext: AudioContext,
    jobId: number,
    totalFrames: number,
    chunkSize: number,
    quality: ChunkQuality = ChunkQuality.COMPRESSED,
): Promise<AudioBuffer> {
    const chunkCount = Math.ceil(totalFrames / chunkSize);

    const rawChunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, i) => (
            serverProxy.frames.getAudioChunk(jobId, i, quality)
        )),
    );

    const decoded = await Promise.all(
        rawChunks.map(({ data }) => audioContext.decodeAudioData(data.slice(0))),
    );

    if (chunkCount === 1) {
        return decoded[0];
    }

    const { sampleRate, numberOfChannels } = decoded[0];
    const totalContentMs = totalFrames;
    const totalContentSamples = Math.round((totalContentMs / 1000) * sampleRate);
    const output = audioContext.createBuffer(numberOfChannels, totalContentSamples, sampleRate);

    let writePos = 0;
    for (let i = 0; i < decoded.length; i++) {
        const buf = decoded[i];
        const { contentOffset } = rawChunks[i];
        const startSample = Math.round((contentOffset / 1000) * sampleRate);

        const isLastChunk = i === decoded.length - 1;
        const contentMs = isLastChunk ?
            totalContentMs - i * chunkSize :
            chunkSize;
        const contentSamples = Math.min(
            Math.round((contentMs / 1000) * sampleRate),
            buf.length - startSample,
            totalContentSamples - writePos,
        );

        if (contentSamples > 0) {
            for (let ch = 0; ch < numberOfChannels; ch++) {
                output.getChannelData(ch).set(
                    buf.getChannelData(ch).subarray(startSample, startSample + contentSamples),
                    writePos,
                );
            }
            writePos += contentSamples;
        }
    }

    return output;
}
