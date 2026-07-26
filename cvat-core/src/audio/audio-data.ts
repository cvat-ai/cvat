// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ChunkQuality } from 'cvat-data';
import serverProxy from '../server-proxy';

function encodeWav(buffer: AudioBuffer): Blob {
    const { numberOfChannels, sampleRate, length } = buffer;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataLength = length * blockAlign;
    const headerLength = 44;

    const out = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(out);

    const writeStr = (off: number, s: string): void => {
        for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, headerLength + dataLength - 8, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);

    const byChannelDate = new Array(numberOfChannels);
    for (let ch = 0; ch < numberOfChannels; ch++) {
        byChannelDate[ch] = buffer.getChannelData(ch);
    }

    let offset = headerLength;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numberOfChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, byChannelDate[ch][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += bytesPerSample;
        }
    }

    return new Blob([out], { type: 'audio/wav' });
}

export async function fetchAndAssembleAudio(
    jobId: number,
    totalFrames: number,
    chunkSize: number,
    quality: ChunkQuality = ChunkQuality.COMPRESSED,
): Promise<Blob> {
    const chunkCount = Math.ceil(totalFrames / chunkSize);

    // NB: every chunk is decoded to PCM and re-encoded as WAV, including the
    // single-chunk case. Serving the raw compressed blob (e.g. a VBR MP3)
    // directly to the player desynchronizes the waveform from playback: the
    // waveform is drawn from the Web-Audio-decoded buffer (exact duration),
    // while seeking/cursor use the <audio> element's duration, which the
    // browser only estimates for VBR streams. WAV is PCM, so both durations
    // match and the rendered waveform stays aligned with what is played.
    const audioContext = new AudioContext();
    try {
        const rawChunks = await Promise.all(
            Array.from({ length: chunkCount }, (_, i) => (
                serverProxy.frames.getAudioChunk(jobId, i, quality)
            )),
        );

        const decoded = await Promise.all(
            rawChunks.map(({ data }) => audioContext.decodeAudioData(data.slice(0))),
        );

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

        return encodeWav(output);
    } finally {
        await audioContext.close();
    }
}
