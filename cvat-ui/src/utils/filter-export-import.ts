// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { JsonLogicTree } from '@react-awesome-query-builder/antd';

export interface FilterExportData {
    version: string;
    timestamp: string;
    filter: JsonLogicTree;
    humanReadable: string;
}

/**
 * Creates a formatted filter export object
 */
export function createFilterExportData(
    filter: JsonLogicTree,
    humanReadable: string,
): FilterExportData {
    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        filter,
        humanReadable,
    };
}

/**
 * Extracts filter logic from imported data, supporting both new and legacy formats
 */
export function extractFilterLogic(importData: any): JsonLogicTree | null {
    if (!importData) {
        return null;
    }

    // Support new format with metadata
    if (importData.filter) {
        return importData.filter;
    }

    // Support legacy format (raw logic)
    if (typeof importData === 'object' && Object.keys(importData).length > 0) {
        return importData;
    }

    return null;
}

/**
 * Validates if the given data is a valid filter format
 */
export function validateFilterData(data: any): boolean {
    try {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        const filterLogic = extractFilterLogic(data);
        return filterLogic !== null && typeof filterLogic === 'object';
    } catch {
        return false;
    }
}

/**
 * Creates a shareable URL with filter parameters
 */
export function createShareableURL(filter: JsonLogicTree, baseURL?: string): string {
    const filterParam = encodeURIComponent(JSON.stringify(filter));
    const url = new URL(baseURL || window.location.href);
    url.searchParams.set('filter', filterParam);
    return url.toString();
}

/**
 * Extracts filter from URL parameters
 */
export function extractFilterFromURL(url?: string): JsonLogicTree | null {
    try {
        const urlObj = new URL(url || window.location.href);
        const filterParam = urlObj.searchParams.get('filter');
        
        if (!filterParam) {
            return null;
        }

        return JSON.parse(decodeURIComponent(filterParam));
    } catch {
        return null;
    }
}

/**
 * Removes filter parameter from URL
 */
export function cleanFilterFromURL(): string {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('filter');
    return `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
}