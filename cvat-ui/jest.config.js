// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.{ts,tsx}',
        '**/*.{spec,test}.{ts,tsx}',
    ],
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/src/__mocks__/fileMock.ts',
        '^cvat-core$': '<rootDir>/../cvat-core/src/api.ts',
        '^cvat-canvas$': '<rootDir>/../cvat-canvas/src/typescript/canvas.ts',
        '^cvat-canvas3d$': '<rootDir>/../cvat-canvas3d/src/typescript/canvas3d.ts',
        '^cvat-data$': '<rootDir>/../cvat-data/src/ts/cvat-data.ts',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                jsx: 'react',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        }],
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/index.tsx',
        '!src/setupTests.ts',
    ],
    coverageThresholds: {
        global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },
    coverageReporters: ['text', 'lcov', 'html'],
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testTimeout: 10000,
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
};
