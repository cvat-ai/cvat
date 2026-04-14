// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Encodes a flattened binary mask into CVAT RLE.
 * The encoded sequence always starts with the length of the initial zero run.
 * Examples:
 * [0, 0, 0, 1] -> [3, 1]
 * [1, 1, 0, 0] -> [0, 2, 2]
 */
export function mask2Rle(mask: ArrayLike<number>): number[] {
    const { length } = mask;
    const acc: number[] = [0];
    if (length === 0) {
        return acc;
    }

    // idx = 0
    const first = mask[0];
    if (first > 0) {
        acc.push(1);
    } else {
        acc[0] = 1;
    }

    // idx > 0
    for (let idx = 1; idx < length; idx++) {
        const val = mask[idx];
        if (mask[idx - 1] === val) {
            acc[acc.length - 1] += 1;
        } else {
            acc.push(1);
        }
    }

    return acc;
}

/**
 * Decodes CVAT RLE back into a flattened binary mask of size width * height.
 * RLE is expected to start with the length of the initial zero run, so:
 * [3, 1] -> [0, 0, 0, 1]
 * [0, 2, 2] -> [1, 1, 0, 0]
 */
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
