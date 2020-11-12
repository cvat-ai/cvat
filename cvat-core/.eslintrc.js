// Copyright (C) 2018-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        node: true,
        browser: true,
        es6: true,
        'jest/globals': true,
    },
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    plugins: ['security', 'jest', 'no-unsafe-innerhtml'],
    extends: ['eslint:recommended', 'plugin:security/recommended', 'plugin:no-unsanitized/DOM', 'airbnb-base'],
    rules: {
        'no-await-in-loop': [0],
        'global-require': [0],
        'no-new': [0],
        'class-methods-use-this': [0],
        'no-restricted-properties': [
            0,
            {
                object: 'Math',
                property: 'pow',
            },
        ],
        'no-plusplus': [0],
        'no-param-reassign': [0],
        'no-underscore-dangle': ['error', { allowAfterThis: true }],
        'no-restricted-syntax': [0, { selector: 'ForOfStatement' }],
        'no-continue': [0],
        'no-unsafe-innerhtml/no-unsafe-innerhtml': 1,
        // This rule actual for user input data on the node.js environment mainly.
        'security/detect-object-injection': 0,
        indent: ['warn', 4],
        'no-useless-constructor': 0,
        'func-names': [0],
        'valid-typeof': [0],
        'no-console': [0],
        'max-classes-per-file': [0],
        'max-len': ['warn', { code: 120 }],
    },
};
