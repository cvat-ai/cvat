// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function isPublic(): boolean {
    return process.env.PUBLIC_INSTANCE === 'true';
}
