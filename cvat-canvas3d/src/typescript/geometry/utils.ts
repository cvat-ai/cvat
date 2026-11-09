// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Ray } from 'three';

const RAY_EPSILON = 1e-6;

export function isFiniteMatrix(matrix: number[][], rows: number, columns: number): boolean {
    return matrix.length === rows && matrix.every((row) => (
        row.length === columns && row.every(Number.isFinite)
    ));
}

export function isFiniteVector(vector: number[]): boolean {
    return vector.every(Number.isFinite);
}

export function areRaysEqual(ray1: Ray | null, ray2: Ray | null): boolean {
    if (ray1 === ray2) {
        return true;
    }

    if (!ray1 || !ray2) {
        return false;
    }

    const epsilonSquared = RAY_EPSILON ** 2;
    return ray1.origin.distanceToSquared(ray2.origin) < epsilonSquared &&
        ray1.direction.distanceToSquared(ray2.direction) < epsilonSquared;
}
