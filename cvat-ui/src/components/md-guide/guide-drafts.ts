// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnnotationGuide } from 'cvat-core-wrapper';

interface AnnotationGuideDraft {
    markdown: string;
    updatedAt: number;
}

function getGuideDraftStorageKey(guideId: number): string {
    // guide id is unique across orgs so we don't need to scope to org id in the key
    // if it changes later it needs to be included here
    return `drafts/guides/${guideId}`;
}

export function clearGuideDraft(guideId: number): void {
    try {
        localStorage.removeItem(getGuideDraftStorageKey(guideId));
    } catch {
        // Ignore errors.
    }
}

export function readGuideDraft(guideId: number): AnnotationGuideDraft | null {
    try {
        const serializedDraft = localStorage.getItem(getGuideDraftStorageKey(guideId));

        if (!serializedDraft) {
            return null;
        }

        const parsedDraft = JSON.parse(serializedDraft) as Partial<AnnotationGuideDraft>;
        if (typeof parsedDraft.markdown === 'string' && typeof parsedDraft.updatedAt === 'number') {
            return {
                markdown: parsedDraft.markdown,
                updatedAt: parsedDraft.updatedAt,
            };
        }

        clearGuideDraft(guideId);
    } catch {
        clearGuideDraft(guideId);
    }

    return null;
}

export function saveGuideDraft(guideId: number, markdown: string): void {
    try {
        const draft: AnnotationGuideDraft = {
            markdown,
            updatedAt: Date.now(),
        };

        localStorage.setItem(getGuideDraftStorageKey(guideId), JSON.stringify(draft));
    } catch {
        // Best-effort approach. Ignore errors.
    }
}

export function shouldRestoreGuideDraft(draft: AnnotationGuideDraft, guide: AnnotationGuide): boolean {
    if (!guide.updatedDate) {
        return false;
    }

    const guideUpdatedAt = Date.parse(guide.updatedDate);

    if (Number.isNaN(guideUpdatedAt)) {
        return false;
    }

    return guideUpdatedAt < draft.updatedAt;
}
