// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function generateString(countPointsToMove, arrow) {
    let action = '';
    for (let i = 0; i < countPointsToMove; i++) {
        action += `{${arrow}}`;
    }
    return action;
}

function deltaTransformPoint(matrix, point) {
    const dx = point.x * matrix.a + point.y * matrix.c;
    const dy = point.x * matrix.b + point.y * matrix.d;
    return { x: dx, y: dy };
}

export function decomposeMatrix(matrix) {
    const px = deltaTransformPoint(matrix, { x: 0, y: 1 });
    const skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90).toFixed(1);
    return skewX;
}
