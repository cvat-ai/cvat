// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Audio data is deliberately kept outside Redux: Redux holds only its token, so
// serialization cannot retain or copy the decoded PCM samples or waveform peaks.
export interface CachedAudioData {
    audioBuffer: AudioBuffer;
    peaks: Float32Array[];
    duration: number;
}

const audioBuffers = new Map<string, CachedAudioData>();
let nextToken = 0;

export function cacheAudioBuffer(audioData: CachedAudioData): string {
    const token = `audio-buffer-${++nextToken}`;
    audioBuffers.set(token, audioData);
    return token;
}

export function getCachedAudioBuffer(token: string): CachedAudioData | null {
    return audioBuffers.get(token) ?? null;
}

export function removeCachedAudioBuffer(token: string): void {
    audioBuffers.delete(token);
}
