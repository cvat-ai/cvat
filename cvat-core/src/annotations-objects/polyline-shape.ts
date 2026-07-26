// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection } from './types';
import { PolyShape } from './poly-shape';

export class PolylineShape extends PolyShape {
    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.POLYLINE;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static distance(points: number[], x: number, y: number): number {
        const distances = [];
        for (let i = 0; i < points.length - 2; i += 2) {
            // Current point
            const x1 = points[i];
            const y1 = points[i + 1];

            // Next point
            const x2 = points[i + 2];
            const y2 = points[i + 3];

            // Find the shortest distance from point to an edge
            // using perpendicular or by the distance to the nearest point

            // Get coordinate vectors
            const AB = [x2 - x1, y2 - y1];
            const BM = [x - x2, y - y2];
            const AM = [x - x1, y - y1];

            // scalar products have different signs for two pairs of vectors
            // it means that perpendicular projection lies on the edge
            if (Math.sign(AB[0] * BM[0] + AB[1] * BM[1]) !== Math.sign(AB[0] * AM[0] + AB[1] * AM[1])) {
                // Find the length of a perpendicular
                // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
                distances.push(
                    Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) /
                        Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2),
                );
            } else {
                // The link below works for lines (which have infinite length)
                // There is a case when perpendicular doesn't cross the edge
                // In this case we don't use the computed distance
                // Instead we use just distance to the nearest point
                distances.push(
                    Math.min(
                        Math.sqrt((x1 - x) ** 2 + (y1 - y) ** 2),
                        Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2),
                    ),
                );
            }
        }

        return Math.min.apply(null, distances);
    }
}
