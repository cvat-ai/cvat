// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ShapeType } from 'cvat-core-wrapper';

export type OrientationAngle = -90 | 90 | 180;

export default function changeObjectOrientation(objectState: ObjectState, degrees: OrientationAngle): boolean {
    const state = objectState;
    if (![ShapeType.RECTANGLE, ShapeType.ELLIPSE].includes(state.shapeType)) {
        return false;
    }

    if (degrees % 180) {
        if (state.shapeType === ShapeType.RECTANGLE) {
            const [left, top, right, bottom] = state.points as number[];
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            const width = right - left;
            const height = bottom - top;
            state.points = [
                centerX - height / 2,
                centerY - width / 2,
                centerX + height / 2,
                centerY + width / 2,
            ];
        } else {
            const [centerX, centerY, rightX, topY] = state.points as number[];
            const radiusX = rightX - centerX;
            const radiusY = centerY - topY;
            state.points = [centerX, centerY, centerX + radiusY, centerY - radiusX];
        }
    }

    state.rotation = ((state.rotation || 0) + degrees + 360) % 360;
    return true;
}
