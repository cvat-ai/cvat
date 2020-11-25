// Copyright (C) 2020 Intel Corporation
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
