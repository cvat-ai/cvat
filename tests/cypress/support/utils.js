// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function generateString(countPointsToMove, arrow) {
    let action = '';
    for (let i = 0; i < countPointsToMove; i++) {
        action += `{${arrow}}`;
    }
    return action;
}

function deltaTransformPoint(matrix, point) {
    const dx = point.x * matrix.a + point.y * matrix.c;
    const dy = point.x * matrix.b + point.y * matrix.d;
    return { x: dx, y: dy };
}

export function decomposeMatrix(matrix) {
    const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
    const skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90).toFixed(1);
    return skewX;
}

export function translatePoints(points, delta, axis) {
    if (axis === 'x') {
        return [
            points[0] + delta,
            points[1],
            points[2] + delta,
            points[3],
        ];
    }
    if (axis === 'y') {
        return [
            points[0],
            points[1] + delta,
            points[2],
            points[3] + delta,
        ];
    }
    return points;
}

export function convertClasses(data, $win) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const prototype = Object.getPrototypeOf(data);
    if ([null, Object.prototype].includes(prototype)) {
        let clone = $win.Object.create(null);

        if (prototype === Object.prototype) {
            clone = new $win.Object();
        }

        for (const key of Object.keys(data)) {
            clone[key] = convertClasses(data[key], $win);
        }

        return clone;
    }

    if (Array.isArray(data)) {
        const clone = new $win.Array();
        for (const item of data) {
            clone.push(convertClasses(item, $win));
        }
        return clone;
    }

    return data;
}
