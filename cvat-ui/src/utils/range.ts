// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export default function range(x: number, y?: number): number[] {
    if (typeof x !== 'undefined' && typeof y !== 'undefined') {
        if (typeof x !== 'number' && typeof y !== 'number') {
            throw new Error(`Range() expects number arguments. Got ${typeof x}, ${typeof y}`);
        }

        if (x >= y) {
            throw new Error(`Range() expects the first argument less or equal than the second. Got ${x}, ${y}`);
        }

        return Array.from(Array(y - x), (_: number, i: number) => i + x);
    }

    if (typeof x !== 'undefined') {
        if (typeof x !== 'number') {
            throw new Error(`Range() expects number arguments. Got ${typeof x}`);
        }

        return [...Array(x).keys()];
    }

    return [];
}
