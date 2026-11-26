// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DatabaseStore } from './indexed-storage';

const JOB_RELATED_STORES = [
    DatabaseStore.COMPRESSED_JOB_CHUNKS,
    DatabaseStore.CONTEXT_IMAGES,
];

export function extractJobIdFromKey(key: string): number | null {
    const match = key.match(/^(\d+)(_|$)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

export function createProtectedJobRecordCallback(
    getProtectedJobIds: () => number[],
): (store: DatabaseStore, key: string) => boolean {
    return (store: DatabaseStore, key: string): boolean => {
        if (!JOB_RELATED_STORES.includes(store)) {
            return false;
        }

        const protectedJobIds = getProtectedJobIds();
        if (protectedJobIds.length === 0) {
            return false;
        }

        const jobId = extractJobIdFromKey(key);
        if (jobId !== null) {
            return protectedJobIds.includes(jobId);
        }

        return false;
    };
}
