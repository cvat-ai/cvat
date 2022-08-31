// Copyright (C) 2018-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        'jest/globals': true,
    },
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'jest.config.js',
        'jsdoc.config.js',
        'src/3rdparty/**',
        'node_modules/**',
        'dist/**',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    plugins: ['jest'],
    rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
    }
};
