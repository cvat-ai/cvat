// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection, InterpolatedPosition } from './types';
import { PolyTrack } from './poly-track';
import { PolygonShape } from './polygon-shape';

export class PolygonTrack extends PolyTrack {
    constructor(data: SerializedTrack, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.POLYGON;
        for (const shape of Object.values(this.shapes)) {
            checkNumberOfPoints(this.shapeType, shape.points);
        }
    }

    protected interpolatePosition(leftPosition, rightPosition, offset): InterpolatedPosition {
        const copyLeft = {
            ...leftPosition,
            points: [...leftPosition.points, leftPosition.points[0], leftPosition.points[1]],
        };

        const copyRight = {
            ...rightPosition,
            points: [...rightPosition.points, rightPosition.points[0], rightPosition.points[1]],
        };

        const result = super.interpolatePosition(copyLeft, copyRight, offset);

        return {
            ...result,
            points: result.points.slice(0, -2),
        };
    }
}

Object.defineProperty(PolygonTrack, 'distance', { value: PolygonShape.distance });
