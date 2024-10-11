// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { FramesMetaData, ObjectState } from 'cvat-core-wrapper';
import { ObjectType, Workspace } from 'reducers';

export interface FilterAnnotationsParams {
    workspace: Workspace;
    groundTruthJobFramesMeta?: FramesMetaData | null;
    exclude?: ObjectType[];
    include?: ObjectType[];
    frame?: number;
}

export function filterAnnotations(annotations: ObjectState[], params: FilterAnnotationsParams): ObjectState[] {
    const {
        workspace, groundTruthJobFramesMeta, exclude, include, frame,
    } = params;

    if (Array.isArray(exclude) && Array.isArray(include)) {
        throw Error('Can not filter annotations with exclude and include filters simultaneously');
    }

    const filteredAnnotations = annotations.filter((state) => {
        if (Array.isArray(exclude) && exclude.includes(state.objectType)) {
            return false;
        }

        if (Array.isArray(include) && !include.includes(state.objectType)) {
            return false;
        }

        // GT tracks are shown only on GT frames
        if (workspace === Workspace.REVIEW && groundTruthJobFramesMeta?.includedFrames && frame) {
            if (state.objectType === ObjectType.TRACK && state.isGroundTruth) {
                // includedFrames has exactly numeration of frames
                // frame N actually corresponds to N * frameStep in absolute numeration
                return groundTruthJobFramesMeta.includedFrames.includes(frame * groundTruthJobFramesMeta.frameStep);
            }
        }

        return true;
    });
    return filteredAnnotations;
}
