// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const { defaults } = require('jest-config');

module.exports = {
    testEnvironment: 'jsdom',
    preset: 'ts-jest',
    coverageDirectory: 'reports/coverage',
    coverageReporters: ['json', ['lcov', { projectRoot: '../' }]],
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
    reporters: ['default', ['jest-junit', { outputDirectory: 'reports/junit' }]],
    testMatch: ['**/tests/**/*.js'],
    testPathIgnorePatterns: ['/node_modules/', '/tests/mocks/*'],
    automock: false,
    transform: {
        '^.+\\.ts?$': [
          'ts-jest',
          { tsconfig: './tsconfig.json', diagnostics: false, },
        ],
    },

};
