// Copyright (C) 2018-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'jest.config.js',
        'jsdoc.config.js',
        'src/3rdparty/**',
        'node_modules/**',
        'dist/**',
        'tests/**/*.js',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
};
