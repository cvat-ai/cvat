// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection, InterpolatedPosition } from './types';
import { PolyTrack } from './poly-track';
import { PointsShape } from './points-shape';
import { isChildObject } from './utils';

export class PointsTrack extends PolyTrack {
    constructor(
        data: SerializedTrack | SerializedTrack['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        if (isChildObject(this._parentId)) {
            this.readOnlyFields = ['group', 'zOrder', 'source', 'rotation'];
        }
        this.shapeType = ShapeType.POINTS;
        for (const shape of Object.values(this.shapes)) {
            checkNumberOfPoints(this.shapeType, shape.points);
        }
    }

    protected interpolatePosition(leftPosition, rightPosition, offset): InterpolatedPosition {
        // interpolate only when one point in both left and right positions
        if (leftPosition.points.length === 2 && rightPosition.points.length === 2) {
            return {
                points: leftPosition.points.map(
                    (value, index) => value + (rightPosition.points[index] - value) * offset,
                ),
                rotation: leftPosition.rotation,
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }

        return {
            points: [...leftPosition.points],
            rotation: leftPosition.rotation,
            occluded: leftPosition.occluded,
            outside: leftPosition.outside,
            zOrder: leftPosition.zOrder,
        };
    }
}

Object.defineProperty(PointsTrack, 'distance', { value: PointsShape.distance });
