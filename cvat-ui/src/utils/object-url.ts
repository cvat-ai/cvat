// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState } from 'cvat-core-wrapper';
import { toClipboard } from 'utils/to-clipboard';

// Builds a link, which opens the object on its frame in a workspace, where the object is displayed
export function makeObjectURL(objectState: ObjectState, frameNumber: number): string {
    const { origin, pathname } = window.location;
    const search = new URLSearchParams({
        frame: `${frameNumber}`,
        type: `${objectState.objectType}`,
        serverID: `${objectState.serverID}`,
    });

    if (objectState.isGroundTruth) {
        // ground truth objects are displayed in the review workspace when conflicts are enabled
        search.set('defaultWorkspace', 'review');
        search.set('showConflicts', 'true');
    }

    return `${origin}${pathname}?${search.toString()}`;
}

export function copyObjectURL(objectState: ObjectState, frameNumber: number): void {
    toClipboard(makeObjectURL(objectState, frameNumber));
}
