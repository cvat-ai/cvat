// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';

export function readLatestFrameStorage(): Map<number, number> {
    let latestFrameStorage: [number, number][] = [];
    try {
        latestFrameStorage = JSON.parse(localStorage.getItem('latestFrameStorage') || '[]');
        if (
            !Array.isArray(latestFrameStorage) || latestFrameStorage.some((item) => (
                !Array.isArray(item) ||
                !Number.isInteger(item[0]) ||
                !Number.isInteger(item[1])
            ))
        ) {
            throw new Error('Incorrect format from local storage');
        }
    } catch (error: unknown) {
        return new Map([]);
    }

    return new Map(latestFrameStorage);
}

export function writeLatestFrame(jobID: number, frame: number): void {
    let storage = readLatestFrameStorage();
    if (storage.has(jobID)) {
        storage.set(jobID, frame);
    } else {
        storage = new Map([
            [jobID, frame],
            ...Array.from(storage.entries())
                .slice(0, config.LOCAL_STORAGE_LAST_FRAME_MEMORY_LIMIT - 1),
        ]);
    }
    localStorage.setItem('latestFrameStorage', JSON.stringify(Array.from(storage.entries())));
}

export function readLatestFrame(jobID: number): number | null {
    const latestFrameStorage = readLatestFrameStorage();
    return latestFrameStorage.get(jobID) || null;
}
