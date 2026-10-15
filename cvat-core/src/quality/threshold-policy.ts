// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SimilarityThresholdPolicy } from './server-response-types';

export const MAX_THRESHOLD_POINTS = 200;

export function validateThresholdPolicy(policy: SimilarityThresholdPolicy): void {
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
        throw new Error('The threshold policy must be an object.');
    }
    if ('type' in policy && policy.type !== 'iou') {
        throw new Error('Only IoU threshold policies are supported.');
    }
    const keys = Object.keys(policy).filter((key) => key !== 'type');
    const expected = policy.mode === 'constant' ? ['mode', 'value'] : ['mode', 'input', 'extrapolation', 'points'];
    if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
        throw new Error('The threshold policy contains missing or unexpected fields.');
    }
    const threshold = (y: number): boolean => Number.isFinite(y) && y >= 0 && y <= 1;
    if (policy.mode === 'constant') {
        if (!threshold(policy.value)) throw new Error('IoU must be between 0 and 100%.');
        return;
    }
    if (policy.mode !== 'linear' || policy.input !== 'gt.shape_area' || policy.extrapolation !== 'clamp') {
        throw new Error('Use linear interpolation by GT shape area with clamped endpoints.');
    }
    if (!Array.isArray(policy.points) || policy.points.length < 2 || policy.points.length > MAX_THRESHOLD_POINTS) {
        throw new Error(`Interpolation requires 2 to ${MAX_THRESHOLD_POINTS} points.`);
    }
    policy.points.forEach((point, index) => {
        if (!Number.isFinite(point.x) || point.x <= 0) throw new Error('GT area must be finite and positive.');
        if (!threshold(point.y)) throw new Error('IoU must be between 0 and 100%.');
        if (index && point.x <= policy.points[index - 1].x) {
            throw new Error('GT areas must be unique and sorted in ascending order.');
        }
    });
}

export function normalizeThresholdPolicy(value: unknown): SimilarityThresholdPolicy {
    const policy = value as SimilarityThresholdPolicy;
    validateThresholdPolicy(policy);
    return policy.mode === 'constant' ? { ...policy, type: 'iou' } : {
        ...policy, type: 'iou', points: policy.points.map((point) => ({ ...point })),
    };
}

export function evaluateThresholdPolicy(policy: SimilarityThresholdPolicy, area: number): number {
    if ('type' in policy && policy.type !== 'iou') throw new Error('Only IoU threshold policies are supported.');
    if (policy.mode === 'constant') return policy.value;
    if (!Number.isFinite(area) || area <= 0) throw new Error('GT area must be finite and positive.');
    const { points } = policy;
    if (area <= points[0].x) return points[0].y;
    if (area >= points[points.length - 1].x) return points[points.length - 1].y;
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (points[middle].x <= area) low = middle;
        else high = middle;
    }
    const a = points[low];
    const b = points[high];
    return a.y + ((b.y - a.y) * (area - a.x)) / (b.x - a.x);
}
