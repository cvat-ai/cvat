// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

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
    if (count === 1) {
        return randomItem(arr);
    }
    // Fisher-Yates shuffle
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function randomBool() {
    return Math.random() > 0.5;
}

/**
 * Returns a random subset of key-value pairs `kv`
 * @param {Object} kv - Updated fields to send to a PATCH endpoint.
 * @returns {Object} - Same object with randomly picked fields
 */
function randomUpdate(kv) {
    const update = new Map();
    for (const [k, v] of Object.entries(kv)) {
        if (randomBool()) {
            update.set(k, v);
        }
    }
    return { ...update };
}

function randomBugTracker() {
    return `http://bugs.example.com/${randomIntBetween(100, 999)}`;
}

export {
    randomBugTracker,
    randomUpdate,
    randomBool,
    randomSample,
};
