// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ColumnFilterItem } from 'antd/lib/table/interface';
import { QualityReport } from 'cvat-core-wrapper';
import config from 'config';

export enum QualityColors {
    GREEN = '#237804',
    YELLOW = '#ed9c00',
    RED = '#ff4d4f',
    GRAY = '#8c8c8c',
}

const ratios = {
    low: 0.82,
    middle: 0.9,
    high: 1,
};

export const qualityColorGenerator = (targetMetric: number) => (value?: number) => {
    const baseValue = targetMetric * 100;

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

export function sorter(path: string) {
    return (obj1: any, obj2: any): number => {
        let currentObj1 = obj1;
        let currentObj2 = obj2;
        let field1: string | number | null = null;
        let field2: string | number | null = null;
        for (const pathSegment of path.split('.')) {
            field1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
            field2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
            currentObj1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
            currentObj2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
        }

        if (field1 !== null && field2 !== null) {
            if (typeof field1 === 'string' && typeof field2 === 'string') return field1.localeCompare(field2);
            if (typeof field1 === 'number' && typeof field2 === 'number' &&
            Number.isFinite(field1) && Number.isFinite(field2)) return field1 - field2;
            if (typeof field1 === 'boolean' && typeof field2 === 'boolean') {
                if (field1 === field2) {
                    return 0;
                }
                return field1 ? -1 : 1;
            }
        }

        if (field1 === null && field2 === null) return 0;

        if (field1 === null || (typeof field1 === 'number' && !Number.isFinite(field1))) {
            return -1;
        }

        return 1;
    };
}

export function collectAssignees(reports: QualityReport[]): ColumnFilterItem[] {
    return Array.from<string | null>(
        new Set(
            reports.map((report: QualityReport) => report.assignee?.username ?? null),
        ),
    ).map((value: string | null) => ({ text: value ?? 'Is Empty', value: value ?? false }));
}

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
