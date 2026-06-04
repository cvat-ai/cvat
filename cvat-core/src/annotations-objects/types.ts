// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type AnnotationHistory from '../annotations-history';
import type { Label } from '../labels';
import type { DimensionType, JobType } from '../enums';
import type { MaskShape } from './shape-models';

export type FrameInfo = {
    width: number;
    height: number;
};

export interface BasicInjection {
    labels: Record<number, Label>;
    groups: { max: number };
    framesInfo: Readonly<{
        [index: number]: Readonly<FrameInfo>;
        isFrameDeleted: (frame: number) => boolean;
    }>;
    history: AnnotationHistory;
    groupColors: Record<number, string>;
    parentID?: number;
    readOnlyFields?: string[];
    dimension: DimensionType;
    jobType: JobType;
    nextClientID: () => number;
    getMasksOnFrame: (frame: number) => MaskShape[];
    replicasCount?: number;
}

export type AnnotationInjection = BasicInjection & {
    parentID?: number;
    readOnlyFields?: string[];
};

export interface TrackedShape {
    serverID?: number;
    occluded: boolean;
    outside: boolean;
    rotation: number;
    zOrder: number;
    points?: number[];
    attributes: Record<number, string>;
}

export interface InterpolatedPosition {
    points: number[];
    rotation: number;
    occluded: boolean;
    outside: boolean;
    zOrder: number;
}

export interface Point2D {
    x: number;
    y: number;
}
