// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type AnnotationHistory from '../annotations-history';
import type { Label } from '../labels';
import type { DimensionType, JobType } from '../enums';
import type { MaskShape } from './mask-shape';

export type FrameInfo = {
    width: number;
    height: number;
};

export type GroupsInfo = {
    max: number;
    colors: Record<number, string>;
};

export interface BasicInjection {
    labels: Record<number, Label>;
    groupsInfo: GroupsInfo;
    framesInfo: Readonly<{
        [index: number]: Readonly<FrameInfo>;
        isFrameDeleted: (frame: number) => boolean;
    }>;
    history: AnnotationHistory;
    parentId?: number;
    dimension: DimensionType;
    jobType: JobType; // comes from job data or is set to JobType.ANNOTATION for task-level collections
    replicasCount?: number; // comes from job data or is undefined for task-level collections
    nextClientID: () => number;
    getMasksOnFrame: (frame: number) => MaskShape[];
}

export type AnnotationInjection = BasicInjection & {
    parentId?: number;
};

export interface TrackedShape {
    serverId?: number;
    occluded: boolean;
    outside: boolean;
    rotation: number;
    zOrder: number;
    points?: number[];
    attributes: Map<number, string>;
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

export interface CommonUpdateFlags {
    label?: boolean;
    attributes?: boolean;
    lock?: boolean;
    color?: boolean;
    hidden?: boolean;
    reset: () => void;
}

export interface UpdateFlags extends CommonUpdateFlags {
    description?: boolean;
    points?: boolean;
    rotation?: boolean;
    outside?: boolean;
    occluded?: boolean;
    keyframe?: boolean;
    zOrder?: boolean;
    pinned?: boolean;
    descriptions?: boolean;
}

export interface AudioIntervalUpdateFlags extends CommonUpdateFlags {
    position?: boolean;
}
