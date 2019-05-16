/*
 * Copyright (C) 2018 Intel Corporation
 * SPDX-License-Identifier: MIT
 */

/* global
    require:false
*/

const { defaults } = require('jest-config');

module.exports = {
    moduleFileExtensions: [
        ...defaults.moduleFileExtensions,
        'ts',
        'tsx',
    ],
    reporters: [
        'default',
        'jest-junit',
    ],
    testMatch: [
        '**/tests/**/*.js',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/mocks/*',
    ],
    automock: false,
};
