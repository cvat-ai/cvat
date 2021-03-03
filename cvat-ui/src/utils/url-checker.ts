// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';

const core = getCore();

export default async (url: string, method: string): Promise<boolean> => {
    try {
        await core.server.request(url, {
            method,
        });
        return true;
    } catch (error) {
        return ![0, 404].includes(error.code);
    }
};
