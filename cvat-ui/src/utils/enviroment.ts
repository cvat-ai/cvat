// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export default function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}
