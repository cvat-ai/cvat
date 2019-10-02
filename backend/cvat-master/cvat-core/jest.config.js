/*
 * Copyright (C) 2019 Intel Corporation
 * SPDX-License-Identifier: MIT
 */

/* global
    require:false
*/

const { defaults } = require('jest-config');

module.exports = {
    coverageDirectory: 'reports/coverage',
    coverageReporters: ['lcov'],
    moduleFileExtensions: [
        ...defaults.moduleFileExtensions,
        'ts',
        'tsx',
    ],
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'reports/junit' }],
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
