// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { getCVATStore } from 'cvat-store';
import { AnnotationState, CombinedState, Workspace } from 'reducers';
import {
    DimensionType, Job, ObjectState, ObjectType,
} from 'cvat-core-wrapper';

export function jobHasUnsavedChanges(jobInstance: Job): boolean {
    return jobInstance.annotations.hasUnsavedChanges() || jobInstance.frames.hasUnsavedChanges();
}

export function canRemoveAnnotations({ job, workspace }: Pick<AnnotationState, 'job' | 'workspace'>): boolean {
    return workspace !== Workspace.REVIEW || job.instance?.dimension !== DimensionType.DIMENSION_3D;
}

export function isAbleToChangeFrame(frame?: number): boolean {
    const store = getCVATStore();

    const state: CombinedState = store.getState();
    const { meta, instance: job } = state.annotation.job;
    const { instance: canvas } = state.annotation.canvas;

    if (meta === null || canvas === null || !job) {
        return false;
    }

    let frameInTheJob = true;
    if (typeof frame === 'number') {
        if (meta.includedFrames) {
            // frame argument comes in job coordinates
            // however includedFrames contains absolute data values
            frameInTheJob = meta.includedFrames.includes(meta.getDataFrameNumber(frame - job.startFrame));
        }

        frameInTheJob = frame >= job.startFrame && frame <= job.stopFrame;
    }

    return canvas.isAbleToChangeFrame() && frameInTheJob && !state.annotation.player.navigationBlocked;
}

export function focusObject(
    state: ObjectState,
    canvas: Canvas | Canvas3d | null,
    focusedObjectPadding?: number,
): void {
    if (state.objectType !== ObjectType.TAG) {
        if (canvas instanceof Canvas) {
            canvas.focus(state.clientID as number, focusedObjectPadding);
        } else if (canvas instanceof Canvas3d) {
            canvas.focus(state.clientID as number);
        }
    }
}
