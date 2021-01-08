// Copyright (C) 2018-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    env: {
        node: true,
        browser: true,
        es6: true,
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    plugins: ['eslint-plugin-header'],
    extends: ['eslint:recommended', 'prettier'],
    rules: {
        'header/header': [2, 'line', [{
            pattern: ' {1}Copyright \\(C\\) (?:20\\d{2}-)?2020 Intel Corporation',
            template: ' Copyright (C) 2020 Intel Corporation'
        }, '', ' SPDX-License-Identifier: MIT']],
    },
};
