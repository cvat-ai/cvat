// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection } from './types';
import { PolyShape } from './poly-shape';

export class PolygonShape extends PolyShape {
    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.POLYGON;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static distance(points: number[], x: number, y: number): number | null {
        function position(x1, y1, x2, y2): number {
            return (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
        }

        let wn = 0;
        const distances = [];

        for (let i = 0, j = points.length - 2; i < points.length - 1; j = i, i += 2) {
            // Current point
            const x1 = points[j];
            const y1 = points[j + 1];

            // Next point
            const x2 = points[i];
            const y2 = points[i + 1];

            // Check if a point is inside a polygon
            // with a winding numbers algorithm
            // https://en.wikipedia.org/wiki/Point_in_polygon#Winding_number_algorithm
            if (y1 <= y) {
                if (y2 > y) {
                    if (position(x1, y1, x2, y2) > 0) {
                        wn++;
                    }
                }
            } else if (y2 <= y) {
                if (position(x1, y1, x2, y2) < 0) {
                    wn--;
                }
            }

            // Find the shortest distance from point to an edge
            // Get an equation of a line in general
            const aCoef = y1 - y2;
            const bCoef = x2 - x1;

            // Vector (aCoef, bCoef) is a perpendicular to line
            // Now find the point where two lines
            // (edge and its perpendicular through the point (x,y)) are cross
            const xCross = x - aCoef;
            const yCross = y - bCoef;

            if ((xCross - x1) * (x2 - xCross) >= 0 && (yCross - y1) * (y2 - yCross) >= 0) {
                // Cross point is on segment between p1(x1,y1) and p2(x2,y2)
                distances.push(Math.sqrt((x - xCross) ** 2 + (y - yCross) ** 2));
            } else {
                distances.push(
                    Math.min(
                        Math.sqrt((x1 - x) ** 2 + (y1 - y) ** 2),
                        Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2),
                    ),
                );
            }
        }

        if (wn !== 0) {
            return Math.min.apply(null, distances);
        }

        return null;
    }
}
