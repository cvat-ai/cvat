// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Point } from './shared';

function calcArea(points: Point[]): number {
    let area = 0;
    let point1 = null;
    let point2 = null;

    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        point1 = points[i];
        point2 = points[j];
        area += point1.x * point2.y;
        area -= point1.y * point2.x;
    }
    area /= 2;

    return area;
}

export default function centroid(points: Point[]): Point {
    let point1 = null;
    let point2 = null;
    let f = 0;
    let x = 0;
    let y = 0;

    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        point1 = points[i];
        point2 = points[j];
        f = point1.x * point2.y - point2.x * point1.y;
        x += (point1.x + point2.x) * f;
        y += (point1.y + point2.y) * f;
    }

    f = calcArea(points) * 6;
    return {
        x: x / f,
        y: y / f,
    };
}
