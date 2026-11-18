// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioIntervalState, Label } from 'cvat-core-wrapper';

export type Range = { start: number; stop: number };
export type DraftRange = { start: number; temporaryEnd?: number; previewEnd?: number };

export function draftEnd(draft: DraftRange, frame: number): number {
    return draft.previewEnd ?? draft.temporaryEnd ?? frame;
}
export type PhaseClip = Range & {
    id: number;
    label: Label;
    members: AudioIntervalState[];
    locked: boolean;
};

export function mergeClips(intervals: AudioIntervalState[], end: number): PhaseClip[] {
    const lastByLabel = new Map<number, PhaseClip>();
    const clips: PhaseClip[] = [];
    for (const interval of [...intervals].sort((a, b) => a.start - b.start)) {
        const labelID = interval.label.id as number;
        const stop = interval.stop ?? end;
        const last = lastByLabel.get(labelID);
        if (last && last.stop >= interval.start) {
            last.stop = Math.max(last.stop, stop);
            last.members.push(interval);
            last.locked ||= interval.lock;
        } else {
            const clip = {
                id: interval.clientID as number,
                label: interval.label,
                start: interval.start,
                stop,
                members: [interval],
                locked: interval.lock,
            };
            lastByLabel.set(labelID, clip);
            clips.push(clip);
        }
    }
    return clips;
}
