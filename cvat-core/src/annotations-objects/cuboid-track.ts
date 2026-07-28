// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DimensionType, ShapeType } from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { checkNumberOfPoints, findAngleDiff } from '../object-utils';
import { Track } from './track';
import type { AnnotationInjection, InterpolatedPosition } from './types';
import { CuboidShape } from './cuboid-shape';

export class CuboidTrack extends Track {
    constructor(data: SerializedTrack, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.CUBOID;
        this.pinned = false;
        for (const shape of Object.values(this.shapes)) {
            checkNumberOfPoints(this.shapeType, shape.points);
            shape.rotation = 0; // is not supported
        }
    }

    protected interpolatePosition(leftPosition, rightPosition, offset): InterpolatedPosition {
        const positionOffset = leftPosition.points.map((point, index) => rightPosition.points[index] - point);
        const result = {
            points: leftPosition.points.map((point, index) => point + positionOffset[index] * offset),
            rotation: leftPosition.rotation,
            occluded: leftPosition.occluded,
            outside: leftPosition.outside,
            zOrder: leftPosition.zOrder,
        };

        if (this.dimension === DimensionType.DIMENSION_3D) {
            // for 3D cuboids angle for different axies stored as a part of points array
            // we need to apply interpolation using the shortest arc for each angle

            const [
                angleX, angleY, angleZ,
            ] = leftPosition.points.slice(3, 6).concat(rightPosition.points.slice(3, 6))
                .map((_angle: number) => {
                    if (_angle < 0) {
                        return _angle + Math.PI * 2;
                    }

                    return _angle;
                })
                .map((_angle) => _angle * (180 / Math.PI))
                .reduce((acc: number[], angleBefore: number, index: number, arr: number[]) => {
                    if (index < 3) {
                        const angleAfter = arr[index + 3];
                        let angle = (angleBefore + findAngleDiff(angleAfter, angleBefore) * offset) * (Math.PI / 180);
                        if (angle > Math.PI) {
                            angle -= Math.PI * 2;
                        }
                        acc.push(angle);
                    }

                    return acc;
                }, []);

            result.points[3] = angleX;
            result.points[4] = angleY;
            result.points[5] = angleZ;
        }

        return result;
    }
}

Object.defineProperty(CuboidTrack, 'distance', { value: CuboidShape.distance });
