// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { CombinedState, ObjectType, Workspace } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';

export interface FilterAnnotationsParams {
    workspace: Workspace;
    exclude?: ObjectType[];
    include?: ObjectType[];
    frame?: number;
}

export function filterAnnotations(annotations: ObjectState[], params: FilterAnnotationsParams): ObjectState[] {
    const {
        workspace, exclude, include, frame,
    } = params;

    if (Array.isArray(exclude) && Array.isArray(include)) {
        throw Error('Can not filter annotations with exclude and include filters simultaneously');
    }

    const store = getCVATStore();
    const state: CombinedState = store.getState();
    const {
        meta,
        instance: job,
        groundTruthInfo: { groundTruthJobFramesMeta },
    } = state.annotation.job;

    const filteredAnnotations = annotations.filter((objectState) => {
        if (Array.isArray(exclude) && exclude.includes(objectState.objectType)) {
            return false;
        }

        if (Array.isArray(include) && !include.includes(objectState.objectType)) {
            return false;
        }

        // GT tracks are shown only on GT frames in annotation jobs
        if (meta && job && workspace === Workspace.REVIEW && groundTruthJobFramesMeta?.includedFrames && frame) {
            if (objectState.objectType === ObjectType.TRACK && objectState.isGroundTruth) {
                // includedFrames has absolute numeration of frames, current frame is in job coordinates
                const dataFrameNumber = meta.getDataFrameNumber(frame - job.startFrame);
                return groundTruthJobFramesMeta.includedFrames.includes(dataFrameNumber);
            }
        }

        return true;
    });
    return filteredAnnotations;
}
