// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import { Shape } from './shape';
import type { AnnotationInjection, Point2D } from './types';

export class CuboidShape extends Shape {
    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.rotation = 0;
        this.shapeType = ShapeType.CUBOID;
        this.pinned = false;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static makeHull(geoPoints: Point2D[]): Point2D[] {
        // Returns the convex hull, assuming that each points[i] <= points[i + 1].
        function makeHullPresorted(points: Point2D[]): Point2D[] {
            if (points.length <= 1) return points.slice();

            // Andrew's monotone chain algorithm. Positive y coordinates correspond to 'up'
            // as per the mathematical convention, instead of 'down' as per the computer
            // graphics convention. This doesn't affect the correctness of the result.

            const upperHull = [];
            for (let i = 0; i < points.length; i += 1) {
                const p = points[`${i}`];
                while (upperHull.length >= 2) {
                    const q = upperHull[upperHull.length - 1];
                    const r = upperHull[upperHull.length - 2];
                    if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upperHull.pop();
                    else break;
                }
                upperHull.push(p);
            }
            upperHull.pop();

            const lowerHull = [];
            for (let i = points.length - 1; i >= 0; i -= 1) {
                const p = points[`${i}`];
                while (lowerHull.length >= 2) {
                    const q = lowerHull[lowerHull.length - 1];
                    const r = lowerHull[lowerHull.length - 2];
                    if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
                    else break;
                }
                lowerHull.push(p);
            }
            lowerHull.pop();

            if (
                upperHull.length === 1 &&
                lowerHull.length === 1 &&
                upperHull[0].x === lowerHull[0].x &&
                upperHull[0].y === lowerHull[0].y
            ) return upperHull;
            return upperHull.concat(lowerHull);
        }

        function pointsComparator(a, b): number {
            if (a.x < b.x) return -1;
            if (a.x > b.x) return +1;
            if (a.y < b.y) return -1;
            if (a.y > b.y) return +1;
            return 0;
        }

        const newPoints = geoPoints.slice();
        newPoints.sort(pointsComparator);
        return makeHullPresorted(newPoints);
    }

    static contain(shapePoints, x, y): boolean {
        function isLeft(P0, P1, P2): number {
            return (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y);
        }

        const points = CuboidShape.makeHull(shapePoints);
        let wn = 0;
        for (let i = 0; i < points.length; i += 1) {
            const p1 = points[`${i}`];
            const p2 = points[i + 1] || points[0];

            if (p1.y <= y) {
                if (p2.y > y) {
                    if (isLeft(p1, p2, { x, y }) > 0) {
                        wn += 1;
                    }
                }
            } else if (p2.y < y) {
                if (isLeft(p1, p2, { x, y }) < 0) {
                    wn -= 1;
                }
            }
        }

        return wn !== 0;
    }

    static distance(actualPoints: number[], x: number, y: number): number | null {
        const points = [];

        for (let i = 0; i < 16; i += 2) {
            points.push({ x: actualPoints[i], y: actualPoints[i + 1] });
        }

        if (!CuboidShape.contain(points, x, y)) return null;

        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i += 1) {
            const p1 = points[`${i}`];
            const p2 = points[i + 1] || points[0];

            // perpendicular from point to straight length
            const distance = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x) /
                Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2);

            // check if perpendicular belongs to the straight segment
            const a = (p1.x - x) ** 2 + (p1.y - y) ** 2;
            const b = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
            const c = (p2.x - x) ** 2 + (p2.y - y) ** 2;
            if (distance < minDistance && a + b - c >= 0 && c + b - a >= 0) {
                minDistance = distance;
            }
        }
        return minDistance;
    }
}
