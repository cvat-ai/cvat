// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}

export function shift<T>(array: Array<T>, k: number): Array<T> {
    if (k % array.length !== 0) {
        return array.slice(k % array.length).concat(array.slice(0, k % array.length));
    }
    return array;
}

export function rotatePoint(x: number, y: number, angle: number, cx = 0, cy = 0): number[] {
    const sin = Math.sin((angle * Math.PI) / 180);
    const cos = Math.cos((angle * Math.PI) / 180);
    const rotX = (x - cx) * cos - (y - cy) * sin + cx;
    const rotY = (y - cy) * cos + (x - cx) * sin + cy;
    return [rotX, rotY];
}

export function mirror2DPoints(points: number[], horizontal: boolean, vertical: boolean): number[] {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i += 2) {
        if (points[i] < minX) minX = points[i];
        if (points[i] > maxX) maxX = points[i];
        if (points[i + 1] < minY) minY = points[i + 1];
        if (points[i + 1] > maxY) maxY = points[i + 1];
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return points.map((val, index) => {
        if (index % 2 === 0) {
            return horizontal ? 2 * cx - val : val;
        }
        return vertical ? 2 * cy - val : val;
    });
}
