// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const globalConfig = require('../.eslintrc.js');

module.exports = {
    env: {
        node: true,
    },
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'node_modules/**',
        'dist/**',
    ],
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 6,
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint'],
    extends: ['plugin:@typescript-eslint/recommended', 'airbnb-typescript/base'],
    rules: {
        ...globalConfig.rules,

        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/lines-between-class-members': 0,
        '@typescript-eslint/no-explicit-any': [0],
        '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-types': [
            'error',
            {
                types: {
                    '{}': false, // TODO: try to fix with Record<string, unknown>
                    object: false, // TODO: try to fix with Record<string, unknown>
                    Function: false, // TODO: try to fix somehow
                },
            },
        ],
    },
};
