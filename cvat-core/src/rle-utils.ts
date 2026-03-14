// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function mask2Rle(mask: ArrayLike<number>): number[] {
    const acc: number[] = [];
    const n = mask.length;
    if (n === 0) {
        return acc;
    }

    // idx = 0
    const first = mask[0];
    if (first > 0) {
        // 0,0,0,1 => [3,1]
        // 1,1,0,0 => [0,2,2]
        acc.push(0, 1);
    } else {
        acc.push(1);
    }

    // idx > 0
    for (let idx = 1; idx < n; idx++) {
        const val = mask[idx];
        if (mask[idx - 1] === val) {
            acc[acc.length - 1] += 1;
        } else {
            acc.push(1);
        }
    }

    return acc;
}

export function rle2Mask(rle: ArrayLike<number>, width: number, height: number): number[] {
    const decoded = Array(width * height).fill(0);
    const { length } = rle;
    let decodedIdx = 0;
    let value = 0;
    let i = 0;

    while (i < length) {
        let count = rle[i];
        while (count > 0) {
            decoded[decodedIdx] = value;
            decodedIdx++;
            count--;
        }
        i++;
        value = Math.abs(value - 1);
    }

    return decoded;
}
