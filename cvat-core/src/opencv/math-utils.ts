// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface Point {
    x: number;
    y: number;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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
