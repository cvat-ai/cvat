// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum QualityColors {
    GREEN = '#237804',
    YELLOW = '#ed9c00',
    RED = '#ff4d4f',
    GRAY = '#8c8c8c',
}

const thresholds = {
    low: 75,
    middle: 82,
    high: 91,
};

export function getQualityColor(value?: number): QualityColors {
    if (!value) {
        return QualityColors.GRAY;
    }

    if (value >= thresholds.high) {
        return QualityColors.GREEN;
    }
    if (value >= thresholds.middle) {
        return QualityColors.YELLOW;
    }
    if (value >= thresholds.low) {
        return QualityColors.RED;
    }

    return QualityColors.GRAY;
}
