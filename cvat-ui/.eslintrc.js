// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        node: true,
    },
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 6,
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    rules: {
        '@typescript-eslint/indent': ['warn', 4],
        'react/jsx-indent': ['warn', 4],
        'react/jsx-indent-props': ['warn', 4],
        'react/jsx-props-no-spreading': 0,
        'jsx-quotes': ['error', 'prefer-single'],
        'arrow-parens': ['error', 'always'],
        '@typescript-eslint/no-explicit-any': [0],
        '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
        'no-restricted-syntax': [0, { selector: 'ForOfStatement' }],
        'no-plusplus': [0],
        'lines-between-class-members': 0,
        'react/no-did-update-set-state': 0, // https://github.com/airbnb/javascript/issues/1875
        quotes: ['error', 'single'],
        'max-len': ['error', { code: 120, ignoreStrings: true }],
        'func-names': ['warn', 'never'],
        'operator-linebreak': ['error', 'after'],
        'react/require-default-props': 'off',
        'react/no-unused-prop-types': 'off',
        'react/no-array-index-key': 'off',
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
    settings: {
        'import/resolver': {
            node: {
                paths: ['src'],
            },
        },
    },
};
