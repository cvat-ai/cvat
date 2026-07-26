// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType } from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { checkNumberOfPoints } from '../object-utils';
import type { AnnotationInjection } from './types';
import { PolyTrack } from './poly-track';
import { PolylineShape } from './polyline-shape';

export class PolylineTrack extends PolyTrack {
    constructor(data: SerializedTrack, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.POLYLINE;
        for (const shape of Object.values(this.shapes)) {
            checkNumberOfPoints(this.shapeType, shape.points);
        }
    }
}

Object.defineProperty(PolylineTrack, 'distance', { value: PolylineShape.distance });
