// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable no-new-func */

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}
