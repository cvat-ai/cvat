// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Decoded audio is held here, outside redux, because an AudioBuffer is not
// serializable. Redux only stores an opaque token that keys into this map; the
// player resolves the token to its buffer when instantiating WaveSurfer.

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioContext();
    }
    return sharedAudioContext;
}

const buffers = new Map<string, AudioBuffer>();

export function setAudioBuffer(token: string, buffer: AudioBuffer): void {
    buffers.set(token, buffer);
}

export function getAudioBuffer(token: string): AudioBuffer | null {
    return buffers.get(token) ?? null;
}

export function deleteAudioBuffer(token: string): void {
    buffers.delete(token);
}
