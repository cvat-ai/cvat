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

export interface Point {
    x: number;
    y: number;
}

export function numberArrayToPoints(coordinates: number[]): Point[] {
    return coordinates.reduce((acc: Point[], _: number, index: number): Point[] => {
        if (index % 2) {
            acc.push({
                x: coordinates[index - 1],
                y: coordinates[index],
            });
        }

        return acc;
    }, []);
}

export function pointsToNumberArray(points: Point[]): number[] {
    return points.reduce((acc: number[], point: Point): number[] => {
        acc.push(point.x, point.y);
        return acc;
    }, []);
}

export function rotatePoint(x: number, y: number, angle: number, cx = 0, cy = 0): number[] {
    const sin = Math.sin((angle * Math.PI) / 180);
    const cos = Math.cos((angle * Math.PI) / 180);
    const rotX = (x - cx) * cos - (y - cy) * sin + cx;
    const rotY = (y - cy) * cos + (x - cx) * sin + cy;
    return [rotX, rotY];
}
