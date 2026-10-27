// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function isFiniteMatrix(matrix: number[][], rows: number, columns: number): boolean {
    return matrix.length === rows && matrix.every((row) => (
        row.length === columns && row.every(Number.isFinite)
    ));
}

export function isFiniteVector(vector: number[]): boolean {
    return vector.every(Number.isFinite);
}
