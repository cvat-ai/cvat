// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import {
    Announcement, ReleaseNote, SeenState, Updates, UpdatesAcknowledgement,
} from './feed';

interface SerializedSeenState {
    last_seen_release_notes_version: string;
    last_seen_announcements_date: string | null;
    promotion_notifications_allowed: boolean;
}

interface SerializedReleaseNote extends Omit<ReleaseNote, 'publishedAt' | 'markdownURL' | 'hasEditionSections'> {
    published_at: string;
    markdown_url: string;
    has_edition_sections: boolean;
}

interface SerializedAnnouncement extends Omit<Announcement, 'publishedAt' | 'imageURL' | 'videoURL' | 'imageAlt' | 'markdownURL'> {
    published_at: string;
    image_url?: string;
    video_url?: string;
    image_alt?: string;
    markdown_url?: string;
}

interface SerializedUpdates extends Omit<Updates,
    'state' | 'latestRelease' | 'latestAnnouncedRelease' | 'announcements' | 'canAcknowledgeAnnouncements' |
    'releaseHistoryURL' | 'announcementHistoryURL' | 'updatesHistoryURL' | 'unavailableSources'
> {
    state: SerializedSeenState;
    latest_release: SerializedReleaseNote | null;
    latest_announced_release: SerializedReleaseNote | null;
    announcements: SerializedAnnouncement[];
    can_acknowledge_announcements: boolean;
    unavailable_sources: Announcement['source'][];
    release_history_url: string;
    announcement_history_url: string;
    updates_history_url: string;
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

function deserializeRelease(release: SerializedReleaseNote | null): ReleaseNote | null {
    if (!release) return null;
    const {
        published_at: publishedAt, markdown_url: markdownURL, has_edition_sections: hasEditionSections, ...rest
    } = release;
    return {
        ...rest, publishedAt, markdownURL, hasEditionSections,
    };
}

function deserializeAnnouncement(announcement: SerializedAnnouncement): Announcement {
    const {
        published_at: publishedAt, image_url: imageURL, video_url: videoURL,
        image_alt: imageAlt, markdown_url: markdownURL, ...rest
    } = announcement;
    return {
        ...rest, publishedAt, imageURL, videoURL, imageAlt, markdownURL,
    };
}

export async function fetchUpdates(signal: AbortSignal): Promise<Updates> {
    const response = await core.server.request('/api/whats-new', {
        method: 'GET', params: { org: '' }, signal, timeout: 25000,
    }) as { data: SerializedUpdates };
    const summary = response.data;
    return {
        edition: summary.edition,
        state: deserializeSeenState(summary.state),
        latestRelease: deserializeRelease(summary.latest_release),
        latestAnnouncedRelease: deserializeRelease(summary.latest_announced_release),
        announcements: summary.announcements.map(deserializeAnnouncement),
        canAcknowledgeAnnouncements: summary.can_acknowledge_announcements,
        unavailableSources: summary.unavailable_sources,
        releaseHistoryURL: summary.release_history_url,
        announcementHistoryURL: summary.announcement_history_url,
        updatesHistoryURL: summary.updates_history_url,
    };
}

export async function acknowledge(
    values: UpdatesAcknowledgement, signal: AbortSignal,
): Promise<SeenState> {
    const data: SerializedUpdatesAcknowledgement = {};
    if (values.releaseVersion !== undefined) data.release_version = values.releaseVersion;
    if (values.announcementsSeenAt !== undefined) data.announcements_seen_at = values.announcementsSeenAt;
    const response = await core.server.request('/api/whats-new/acknowledge', {
        method: 'POST', params: { org: '' }, data, signal, timeout: 25000,
    }) as { data: SerializedSeenState };
    return deserializeSeenState(response.data);
}
