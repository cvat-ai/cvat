// Copyright (C) 2018-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        node: true,
        browser: true,
        es6: true,
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
        parser: 'babel-eslint',
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    plugins: ['jest'],
    rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
      }
};
