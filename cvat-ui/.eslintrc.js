// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    'env': {
        'node': true,
        'browser': true,
        'es6': true,
    },
    'parserOptions': {
        'parser': '@typescript-eslint/parser',
        'ecmaVersion': 6,
        'project': './tsconfig.json',
    },
    'plugins': [
        '@typescript-eslint',
        'import',
    ],
    'ignorePatterns': ['*.svg', '*.scss'],
    'extends': [
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    'rules': {
        '@typescript-eslint/indent': ['warn', 4],
        'react/jsx-indent': ['warn', 4],
        'react/jsx-indent-props': ['warn', 4],
        'react/jsx-props-no-spreading': 0,
        'jsx-quotes': ['error', 'prefer-single'],
        'arrow-parens': ['error', 'always'],
        '@typescript-eslint/no-explicit-any': [0],
        '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
        'no-restricted-syntax': [0, {'selector': 'ForOfStatement'}],
        'no-plusplus': [0],
        'lines-between-class-members': 0,
        'react/no-did-update-set-state': 0, // https://github.com/airbnb/javascript/issues/1875
    },
    'settings': {
        'import/resolver': {
            'typescript': {
                'directory': './tsconfig.json'
            }
        },
    },
};
