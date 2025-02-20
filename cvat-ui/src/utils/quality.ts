// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

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

export function tablePaginationPageSize(pageHeight: number): number {
    if (pageHeight > 1600) {
        return 100;
    }
    if (pageHeight > 1100) {
        return 50;
    }
    if (pageHeight > 950) {
        return 20;
    }

    return 10;
}
