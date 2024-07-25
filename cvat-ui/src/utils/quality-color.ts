// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum QualityColors {
    GREEN = '#237804',
    YELLOW = '#ed9c00',
    RED = '#ff4d4f',
    GRAY = '#8c8c8c',
}

export const BASE_TARGET_THRESHOLD = 80;

const ratios = {
    low: 0.82,
    middle: 0.9,
    high: 1,
};

export const qualityColorGenerator = (targetMetric?: number) => (value?: number) => {
    const baseValue = targetMetric ?? BASE_TARGET_THRESHOLD;

    const thresholds = {
        low: baseValue * ratios.low,
        middle: baseValue * ratios.middle,
        high: baseValue * ratios.high,
    };

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
};
