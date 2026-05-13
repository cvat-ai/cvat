// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable indent */

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}
