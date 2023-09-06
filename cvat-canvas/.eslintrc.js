// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'node_modules/**',
        'dist/**',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
};
