// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}
