// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { FramesMetaData, ObjectState } from 'cvat-core-wrapper';
import { ObjectType, Workspace } from 'reducers';

export interface FilterAnnotationsParams {
    workspace: Workspace;
    statesSources: number[];
    groundTruthJobFramesMeta?: FramesMetaData | null;
    filterTags?: boolean;
    frame: number;
}

export function filterAnnotations(annotations: ObjectState[], params: FilterAnnotationsParams): ObjectState[] {
    const {
        workspace, statesSources, groundTruthJobFramesMeta, filterTags, frame,
    } = params;
    const filteredAnnotations = annotations.filter((state) => {
        if (filterTags && state.objectType === ObjectType.TAG) {
            return false;
        }

        if (state.jobID && !statesSources.includes(state.jobID)) {
            return false;
        }

        // GT tracks are shown only on GT frames
        if (workspace === Workspace.REVIEW_WORKSPACE && groundTruthJobFramesMeta) {
            if (state.objectType === ObjectType.TRACK && state.isGroundTruth) {
                return groundTruthJobFramesMeta.includedFrames.includes(frame);
            }
        }

        return true;
    });
    return filteredAnnotations;
}
