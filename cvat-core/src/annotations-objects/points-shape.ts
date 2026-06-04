// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection } from './types';
import { PolyShape } from './poly-shape';
import { isChildObject } from './utils';

export class PointsShape extends PolyShape {
    constructor(
        data: SerializedShape | SerializedShape['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        if (isChildObject(this._parentId)) {
            this.readOnlyFields = ['group', 'zOrder', 'source', 'rotation'];
        }
        this.shapeType = ShapeType.POINTS;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static distance(points: number[], x: number, y: number): number {
        const distances = [];
        for (let i = 0; i < points.length; i += 2) {
            const x1 = points[i];
            const y1 = points[i + 1];

            distances.push(Math.sqrt((x1 - x) ** 2 + (y1 - y) ** 2));
        }

        return Math.min.apply(null, distances);
    }
}
