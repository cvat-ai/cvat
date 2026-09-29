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

const audioDataCache = new Map<string, CachedAudioData>();
let nextToken = 0;

export function cacheAudioData(audioData: CachedAudioData): string {
    const token = `audio-data-${++nextToken}`;
    audioDataCache.set(token, audioData);
    return token;
}

export function getCachedAudioData(token: string): CachedAudioData | null {
    return audioDataCache.get(token) ?? null;
}

export function removeCachedAudioData(token: string): void {
    audioDataCache.delete(token);
}
