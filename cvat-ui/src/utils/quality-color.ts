// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

enum QualityColors {
    GREEN = '#237804',
    YELLOW = '#ffec3d',
    RED = '#ff4d4f',
}

const thresholds = {
    low: 75,
    middle: 82,
    high: 91,
};

export function getColor(value: number): QualityColors {
    if (value >= thresholds.high) {
        return QualityColors.GREEN;
    }
    if (value >= thresholds.middle) {
        return QualityColors.YELLOW;
    }

    return QualityColors.RED;
}
