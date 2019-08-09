/*
 * Copyright (C) 2019 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

module.exports = {
    'env': {
        'node': true,
        'browser': true,
        'es6': true,
    },
    'parserOptions': {
        'parser': '@typescript-eslint/parser',
        'sourceType': 'module',
        'ecmaVersion': 6,
    },
    'plugins': [
        '@typescript-eslint',
    ],
    'extends': [
        'plugin:security/recommended',
        'plugin:no-unsanitized/DOM',
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript/base',
    ],
    'rules': {
        '@typescript-eslint/no-explicit-any': false,
        'indent': ['warn', 4],
        'no-plusplus': false,
        'no-restricted-syntax': [
            false,
            {
                'selector': 'ForOfStatement'
            }
        ],
        'no-continue': false,
        'func-names': false,
        'no-console': false, // this rule deprecates console.log, console.warn etc. because 'it is not good in production code'
        'lines-between-class-members': false,
    },
    'settings': {
        'import/resolver': {
            'node': {
                'extensions': ['.ts', '.js', '.json'],
            },
        },
    },
};
