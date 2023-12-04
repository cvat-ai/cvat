// Copyright (C) 2018-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    ignorePatterns: [
        '.eslintrc.cjs',
        'webpack.config.cjs',
        'jest.config.cjs',
        'node_modules/**',
        'dist/**',
        'tests/**/*.cjs',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
};
