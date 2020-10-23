// Copyright (C) 2018-2020 Intel Corporation
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
        'header/header': [2, 'line', [{
            pattern: ' {1}Copyright \\(C\\) (?:20\\d{2}-)?2020 Intel Corporation',
            template: ' Copyright (C) 2020 Intel Corporation'
        }, '', ' SPDX-License-Identifier: MIT']],
    },
};
