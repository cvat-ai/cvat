// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        node: false,
        browser: true,
        es6: true,
        jquery: true,
        qunit: true,
        'jest/globals': true,
        'cypress/globals': true,
    },
    parserOptions: {
        sourceType: 'script',
    },
    plugins: ['requirejs', 'jest', 'cypress', 'eslint-plugin-header'],
    extends: ['eslint:recommended', 'plugin:requirejs/recommended', 'prettier'],
    rules: {
        'header/header': [2, '.header.js'],
    },
};
