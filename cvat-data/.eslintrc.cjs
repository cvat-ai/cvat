// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    ignorePatterns: [
        'src/ts/3rdparty/**',
        'node_modules/**',
        'dist/**',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
};
