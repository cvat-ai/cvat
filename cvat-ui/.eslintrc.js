// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const globalConfig = require('../.eslintrc.js');

module.exports = {
    env: {
        node: true,
    },
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 6,
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'node_modules/**',
        'dist/**',
    ],
    plugins: ['@typescript-eslint'],
    extends: ['plugin:@typescript-eslint/recommended', 'airbnb-typescript'],
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

        'react/no-did-update-set-state': 0, // https://github.com/airbnb/javascript/issues/1875
        'react/require-default-props': 'off',
        'react/no-unused-prop-types': 'off',
        'react/no-array-index-key': 'off',
        'react/static-property-placement': ['error', 'static public field'],
        'react/jsx-indent': ['warn', 4],
        'react/jsx-indent-props': ['warn', 4],
        'react/jsx-props-no-spreading': 0,
        'jsx-quotes': ['error', 'prefer-single'],
    },
    // settings: {
    //     'import/resolver': {
    //         node: {
    //             paths: ['src', `${__dirname}/src`],
    //         },
    //     },
    // },
};
