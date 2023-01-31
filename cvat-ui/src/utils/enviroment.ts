// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable no-new-func */

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function customWaViewHit(pageName?: string, queryString?: string, hashInfo?: string): void {
    const waHitFunctionName = process.env.WA_PAGE_VIEW_HIT;
    if (waHitFunctionName) {
        const waHitFunction = new Function(
            'pageName',
            'queryString',
            'hashInfo',
            `if (typeof ${waHitFunctionName} === 'function') {
                ${waHitFunctionName}(pageName, queryString, hashInfo);
            }`,
        );
        try {
            waHitFunction(pageName, queryString, hashInfo);
        } catch (error: any) {
            // eslint-disable-next-line
            console.error(`Web analitycs hit function has failed. ${error.toString()}`);
        }
    }
}
