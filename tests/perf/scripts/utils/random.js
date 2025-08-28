// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Returns a random sample of `count` unique elements from `arr` using Fisher-Yates shuffle.
 * @param {Array} arr - The source array.
 * @param {number} count - Number of elements to sample.
 * @returns {Array} Array of sampled elements.
 */
function randomSample(arr, count) {
    if (count >= arr.length) {
        return [...arr];
    }
    // Fisher-Yates shuffle
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

export default {
    randomSample,
};
