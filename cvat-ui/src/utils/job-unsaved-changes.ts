// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Job } from 'cvat-core-wrapper';

/**
 * True when the job has unsaved annotation edits and/or unsaved frame meta
 * changes (e.g. deleted/restored frames). Used for leave/beforeunload prompts.
 * See https://github.com/cvat-ai/cvat/issues/8505
 */
export function jobHasUnsavedChanges(jobInstance: Job): boolean {
    return (
        jobInstance.annotations.hasUnsavedChanges() ||
        jobInstance.frames.hasUnsavedChanges()
    );
}
