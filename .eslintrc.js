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
    },
    parserOptions: {
        sourceType: 'script',
    },
    plugins: ['requirejs', 'eslint-plugin-header'],
    extends: ['eslint:recommended', 'plugin:requirejs/recommended', 'prettier'],
    rules: {
        'header/header': [2, '.header.js'],
    },
};
