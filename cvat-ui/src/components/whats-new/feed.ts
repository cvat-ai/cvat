// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface ReleaseNote {
    version: string;
    title: string;
    description: string;
    publishedAt: string;
    announce: boolean;
    url: string;
    markdownURL: string;
    editions: Edition[];
    hasEditionSections: boolean;
    highlights: string[];
}

function versionParts(value: unknown): number[] | null {
    if (typeof value !== 'string') return null;
    const stable = value.replace(/^v/, '').split(/[-+]/)[0];
    const components = stable.split('.');
    if (components.length !== 3 || components.some((part) => !/^\d+$/.test(part))) return null;
    const parts = components.map(Number);
    return parts.every(Number.isSafeInteger) ? parts : null;
}

export function compareVersions(left: string, right: string): number {
    const leftParts = versionParts(left);
    const rightParts = versionParts(right);
    if (!leftParts || !rightParts) throw new Error('Invalid release version');
    for (let index = 0; index < leftParts.length; index++) {
        if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
    }
    return 0;
}

export function contentURL(value: string, base?: string): string | undefined {
    try {
        const url = new URL(value, base);
        if (url.username || url.password || url.protocol !== 'https:') {
            return undefined;
        }
        return url.href;
    } catch {
        return undefined;
    }
}

export function isNewVersion(version: string, shown: string | null): boolean {
    return !shown || compareVersions(version, shown) > 0;
}

export type Edition = 'community' | 'enterprise' | 'saas';

export const EDITION_LABELS: Record<Edition, string> = {
    community: 'Community',
    enterprise: 'Enterprise',
    saas: 'CVAT Online',
};

export interface PostPreview {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    url: string;
    imageURL?: string;
    videoURL?: string;
    imageAlt?: string;
    cta?: string;
    label?: string;
}

export interface Announcement extends PostPreview {
    editions: Edition[];
    popup: boolean;
    source: 'hugo' | 'external';
    markdownURL?: string;
}

export interface SeenState {
    last_seen_release_notes_version: string | null;
    last_seen_announcements_date: string | null;
    promotion_notifications_allowed: boolean;
}

export interface Updates {
    edition: Edition;
    releases: ReleaseNote[];
    announcements: Announcement[];
    canAcknowledgeAnnouncements: boolean;
    state: SeenState;
    errors: ('release-notes' | 'announcements' | 'external-announcements')[];
    releaseHistoryURL: string;
    announcementHistoryURL: string;
    updatesHistoryURL: string;
}

export function unseenAnnouncements(items: Announcement[], seenAt: string | null): Announcement[] {
    const cutoff = seenAt ? Date.parse(seenAt) : -Infinity;
    return items.filter((item) => Date.parse(item.publishedAt) > cutoff)
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function latestAnnouncementsDate(items: Announcement[]): string | null {
    return items.reduce<string | null>((latest, item) => (
        !latest || Date.parse(item.publishedAt) > Date.parse(latest) ? item.publishedAt : latest
    ), null);
}

export function announcementKey(item: Announcement): string {
    return `${item.source}:${item.id}`;
}
