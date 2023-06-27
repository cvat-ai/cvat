// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';

export function percent(a?: number, b?: number): string | number {
    if (typeof a !== 'undefined' && Number.isFinite(a) && b) {
        return `${Number((a / b) * 100).toFixed(1)}%`;
    }
    return 'N/A';
}

export function clampValue(a?: number): string | number {
    if (typeof a !== 'undefined' && Number.isFinite(a)) {
        if (a <= config.NUMERIC_VALUE_CLAMP_THRESHOLD) return a;
        return `> ${config.NUMERIC_VALUE_CLAMP_THRESHOLD}`;
    }
    return 'N/A';
}

export function toRepresentation(val?: number): string {
    return (!Number.isFinite(val) ? 'N/A' : `${val?.toFixed(1)}%`);
}
