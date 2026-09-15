// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { checkNumberOfPoints, findAngleDiff } from '../object-utils';
import { Track } from './track';
import type { AnnotationInjection, InterpolatedPosition } from './types';
import { EllipseShape } from './ellipse-shape';

export class EllipseTrack extends Track {
    constructor(data: SerializedTrack, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.ELLIPSE;
        this.pinned = false;
        for (const shape of Object.values(this.shapes)) {
            checkNumberOfPoints(this.shapeType, shape.points);
        }
    }

    interpolatePosition(leftPosition, rightPosition, offset): InterpolatedPosition {
        const positionOffset = leftPosition.points.map((point, index) => rightPosition.points[index] - point);

        return {
            points: leftPosition.points.map((point, index) => point + positionOffset[index] * offset),
            rotation:
                (leftPosition.rotation + findAngleDiff(
                    rightPosition.rotation, leftPosition.rotation,
                ) * offset + 360) % 360,
            occluded: leftPosition.occluded,
            outside: leftPosition.outside,
            zOrder: leftPosition.zOrder,
        };
    }
}

Object.defineProperty(EllipseTrack, 'distance', { value: EllipseShape.distance });
