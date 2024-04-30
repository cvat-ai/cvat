// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';

export function toRepresentation(val?: number, isPercent = true, decimals = 1): string {
    if (!Number.isFinite(val)) {
        return 'N/A';
    }

    let repr = '';
    if (!val || (isPercent && (val === 100))) {
        repr = `${val}`; // remove noise in the fractional part
    } else {
        repr = `${val?.toFixed(decimals)}`;
    }

    if (isPercent) {
        repr += `${isPercent ? '%' : ''}`;
    }

    return repr;
}

export function percent(a?: number, b?: number, decimals = 1): string | number {
    if (typeof a !== 'undefined' && Number.isFinite(a) && b) {
        return toRepresentation(Number(a / b) * 100, true, decimals);
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
