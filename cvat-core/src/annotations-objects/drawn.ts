// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type ObjectState from '../object-state';
import { checkObjectType } from '../common';
import { clamp } from '../opencv/math-utils';
import { ShapeType, HistoryActions, DimensionType } from '../enums';
import {
    checkNumberOfPoints, checkShapeArea,
} from '../object-utils';
import { ImageObject } from './image-object';
import type { AnnotationInjection } from './types';
import { isChildObject } from './utils';

export class Drawn extends ImageObject {
    protected descriptions: string[];
    protected pinned: boolean;
    public shapeType: ShapeType;

    constructor(data, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.descriptions = data.descriptions || [];
        this.pinned = true;
        this.shapeType = null;
    }

    protected saveDescriptions(descriptions: string[]): void {
        this.descriptions = [...descriptions];
    }

    protected savePinned(pinned: boolean, frame: number): void {
        const undoPinned = this.pinned;
        const redoPinned = pinned;

        this.history.do(
            HistoryActions.CHANGED_PINNED,
            () => {
                this.pinned = undoPinned;
                this.updated = Date.now();
            },
            () => {
                this.pinned = redoPinned;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.pinned = pinned;
    }

    private fitPoints(points: number[], rotation: number, maxX: number, maxY: number): number[] {
        const { shapeType, _parentId } = this;
        checkObjectType('rotation', rotation, 'number');
        points.forEach((coordinate) => checkObjectType('coordinate', coordinate, 'number'));

        if (isChildObject(_parentId) || shapeType === ShapeType.CUBOID ||
            shapeType === ShapeType.ELLIPSE || !!rotation) {
            // cuboids, rotated bounding boxes, and skeleton elements cannot be fitted
            return points;
        }

        const fittedPoints = [];

        for (let i = 0; i < points.length - 1; i += 2) {
            const x = points[i];
            const y = points[i + 1];
            const clampedX = clamp(x, 0, maxX);
            const clampedY = clamp(y, 0, maxY);
            fittedPoints.push(clampedX, clampedY);
        }

        return fittedPoints;
    }

    protected validateStateBeforeSave(data: ObjectState, updated: ObjectState['updateFlags'], frame?: number): number[] {
        super.validateStateBeforeSave(data, updated);

        let fittedPoints = [];
        if (updated.points && Number.isInteger(frame)) {
            checkObjectType('points', data.points, null, { cls: Array, name: 'Array' });
            checkNumberOfPoints(this.shapeType, data.points);
            // cut points
            const { width, height } = this.framesInfo[frame];
            fittedPoints = this.fitPoints(data.points, data.rotation, width, height);
            if (this.dimension === DimensionType.DIMENSION_2D && !checkShapeArea(this.shapeType, fittedPoints)) {
                fittedPoints = [];
            }
        }

        return fittedPoints;
    }
}
