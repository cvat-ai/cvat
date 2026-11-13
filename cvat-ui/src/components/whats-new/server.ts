// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { SeenState, Updates, UpdatesAcknowledgement } from './feed';

interface SerializedSeenState {
    last_seen_release_notes_version: string;
    last_seen_announcements_date: string | null;
    promotion_notifications_allowed: boolean;
}

interface SerializedUpdates extends Omit<Updates, 'state'> {
    state: SerializedSeenState;
}

interface SerializedUpdatesAcknowledgement {
    release_version?: string;
    announcements_seen_at?: string;
}

const core = getCore();

function deserializeSeenState(state: SerializedSeenState): SeenState {
    return {
        lastSeenReleaseNotesVersion: state.last_seen_release_notes_version,
        lastSeenAnnouncementsDate: state.last_seen_announcements_date,
        promotionNotificationsAllowed: state.promotion_notifications_allowed,
    };
}

export async function fetchUpdates(signal: AbortSignal): Promise<Updates> {
    const response = await core.server.request('/api/product-updates', {
        method: 'GET', params: { org: '' }, signal, timeout: 25000,
    }) as { data: SerializedUpdates };
    return { ...response.data, state: deserializeSeenState(response.data.state) };
}

export async function acknowledge(
    values: UpdatesAcknowledgement, signal: AbortSignal,
): Promise<SeenState> {
    const data: SerializedUpdatesAcknowledgement = {};
    if (values.releaseVersion !== undefined) data.release_version = values.releaseVersion;
    if (values.announcementsSeenAt !== undefined) data.announcements_seen_at = values.announcementsSeenAt;
    const response = await core.server.request('/api/product-updates/acknowledge', {
        method: 'POST', params: { org: '' }, data, signal, timeout: 25000,
    }) as { data: SerializedSeenState };
    return deserializeSeenState(response.data);
}
