// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { checkNumberOfPoints, rotatePoint } from '../object-utils';
import { Shape } from './shape';
import type { AnnotationInjection } from './types';

export class RectangleShape extends Shape {
    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.RECTANGLE;
        this.pinned = false;
        checkNumberOfPoints(this.shapeType, this.points);
    }

    static distance(points: number[], x: number, y: number, angle: number): number | null {
        const [xtl, ytl, xbr, ybr] = points;
        const cx = xtl + (xbr - xtl) / 2;
        const cy = ytl + (ybr - ytl) / 2;
        const [rotX, rotY] = rotatePoint(x, y, -angle, cx, cy);

        if (!(rotX >= xtl && rotX <= xbr && rotY >= ytl && rotY <= ybr)) {
            // Cursor is outside of a box
            return null;
        }

        // The shortest distance from point to an edge
        return Math.min.apply(null, [rotX - xtl, rotY - ytl, xbr - rotX, ybr - rotY]);
    }
}
