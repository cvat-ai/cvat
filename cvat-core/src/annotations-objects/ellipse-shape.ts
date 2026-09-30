// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints, rotatePoint } from '../object-utils';
import { Shape } from './shape';
import type { AnnotationInjection } from './types';

export class EllipseShape extends Shape {
    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.ELLIPSE;
        this.pinned = false;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static distance(points: number[], x: number, y: number, angle: number): number | null {
        const [cx, cy, rightX, topY] = points;
        const [rx, ry] = [rightX - cx, cy - topY];
        const [rotX, rotY] = rotatePoint(x, y, -angle, cx, cy);
        // https://math.stackexchange.com/questions/76457/check-if-a-point-is-within-an-ellipse
        const pointWithinEllipse = (_x: number, _y: number): boolean => (
            ((_x - cx) ** 2) / rx ** 2) + (((_y - cy) ** 2) / ry ** 2
        ) <= 1;

        if (!pointWithinEllipse(rotX, rotY)) {
            // Cursor is outside of an ellipse
            return null;
        }

        if (Math.abs(x - cx) < Number.EPSILON && Math.abs(y - cy) < Number.EPSILON) {
            // cursor is near to the center, just return minimum of height, width
            return Math.min(rx, ry);
        }

        // ellipse equation is x^2/rx^2 + y^2/ry^2 = 1
        // from this equation:
        // x^2 = ((rx * ry)^2 - (y * rx)^2) / ry^2
        // y^2 = ((rx * ry)^2 - (x * ry)^2) / rx^2

        // we have one point inside the ellipse, let's build two lines (horizontal and vertical) through the point
        // and find their interception with ellipse
        const x2Equation = (_y: number): number => (((rx * ry) ** 2) - ((_y * rx) ** 2)) / (ry ** 2);
        const y2Equation = (_x: number): number => (((rx * ry) ** 2) - ((_x * ry) ** 2)) / (rx ** 2);

        // shift x,y to the ellipse coordinate system to compute equation correctly
        // y axis is inverted
        const [shiftedX, shiftedY] = [x - cx, cy - y];
        const [x1, x2] = [Math.sqrt(x2Equation(shiftedY)), -Math.sqrt(x2Equation(shiftedY))];
        const [y1, y2] = [Math.sqrt(y2Equation(shiftedX)), -Math.sqrt(y2Equation(shiftedX))];

        // found two points on ellipse edge
        const ellipseP1X = shiftedX >= 0 ? x1 : x2; // ellipseP1Y is shiftedY
        const ellipseP2Y = shiftedY >= 0 ? y1 : y2; // ellipseP1X is shiftedX

        // found diffs between two points on edges and target point
        const diff1X = ellipseP1X - shiftedX;
        const diff2Y = ellipseP2Y - shiftedY;

        // return minimum, get absolute value because we need distance, not diff
        return Math.min(Math.abs(diff1X), Math.abs(diff2Y));
    }
}
