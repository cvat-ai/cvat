// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const { defaults } = require('jest-config');

module.exports = {
    testEnvironment: 'jsdom',
    coverageDirectory: 'reports/coverage',
    coverageReporters: ['json', ['lcov', { projectRoot: '../' }]],
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
    reporters: ['default', ['jest-junit', { outputDirectory: 'reports/junit' }]],
    testMatch: ['**/tests/**/*.cjs'],
    testPathIgnorePatterns: ['/node_modules/', '/tests/mocks/*'],
    automock: false,
};
