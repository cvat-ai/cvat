// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    defineCypressConfig,
    defineIgnores,
} from '../eslint.config.mjs';

export default [
    ...defineIgnores(),
    ...defineCypressConfig({
        files: [
            'cypress/**/*.js',
            '*cypress*.config.js',
        ],
        pluginFiles: [
            'cypress/plugins/**/*.js',
        ],
    }),
];
