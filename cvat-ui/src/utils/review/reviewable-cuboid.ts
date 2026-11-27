// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ObjectType, ShapeType } from 'cvat-core-wrapper';

type ReviewableCuboid = ObjectState & { objectType: ObjectType.SHAPE | ObjectType.TRACK };

export function isReviewableCuboid(object: ObjectState): object is ReviewableCuboid {
    return !object.isGroundTruth && !object.outside && !object.hidden && object.shapeType === ShapeType.CUBOID &&
        (object.objectType === ObjectType.SHAPE || object.objectType === ObjectType.TRACK);
}
