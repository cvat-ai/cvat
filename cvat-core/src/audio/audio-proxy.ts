// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ChunkQuality } from 'cvat-data';
import serverProxy from '../server-proxy';

interface AudioChunkResponse {
    data: ArrayBuffer;
    contentOffset: number;
}

async function getAudioChunk(
    jobId: number,
    chunkIndex: number,
    quality: ChunkQuality,
): Promise<AudioChunkResponse> {
    return serverProxy.frames.getAudioChunk(jobId, chunkIndex, quality);
}

export default Object.freeze({
    getAudioChunk,
});
