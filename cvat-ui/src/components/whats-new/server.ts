// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { SeenState, Updates } from './feed';

const core = getCore();

export async function fetchUpdates(signal: AbortSignal): Promise<Updates> {
    const response = await core.server.request('/api/updates', {
        method: 'GET', params: { org: '' }, signal, timeout: 25000,
    }) as { data: Updates };
    return response.data;
}

export async function acknowledge(
    values: { release_version?: string; announcements_seen_at?: string }, signal: AbortSignal,
): Promise<SeenState> {
    const response = await core.server.request('/api/updates/acknowledge', {
        method: 'POST', params: { org: '' }, data: values, signal, timeout: 25000,
    }) as { data: SeenState };
    return response.data;
}
