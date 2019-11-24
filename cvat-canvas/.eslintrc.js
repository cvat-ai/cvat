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
        'ecmaVersion': 6,
    },
    'plugins': [
        '@typescript-eslint',
        'import',
    ],
    'extends': [
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript/base',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    'rules': {
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/indent': ['warn', 4],
        'no-plusplus': 0,
        'no-restricted-syntax': [
            0,
            {
                'selector': 'ForOfStatement'
            }
        ],
        'no-continue': 0,
        'func-names': 0,
        'no-console': 0, // this rule deprecates console.log, console.warn etc. because 'it is not good in production code'
        'lines-between-class-members': 0,
        'import/prefer-default-export': 0, // works incorrect with interfaces
        'newline-per-chained-call': 0, // makes code uglier
    },
    'settings': {
        'import/resolver': {
            'node': {
                'extensions': ['.ts', '.js', '.json'],
            },
        },
    },
};
