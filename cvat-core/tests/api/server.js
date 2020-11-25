// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

// Initialize api
window.cvat = require('../../src/api');
const { AnnotationFormats, Loader, Dumper } = require('../../src/annotation-formats');

// Test cases
describe('Feature: get info about cvat', () => {
    test('get info about server', async () => {
        const result = await window.cvat.server.about();
        expect(result).toBeInstanceOf(Object);
        expect('name' in result).toBeTruthy();
        expect('description' in result).toBeTruthy();
        expect('version' in result).toBeTruthy();
    });
});

describe('Feature: get share storage info', () => {
    test('get files in a root of a share storage', async () => {
        const result = await window.cvat.server.share();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(5);
    });

    test('get files in a some dir of a share storage', async () => {
        const result = await window.cvat.server.share('images');
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(8);
    });

    test('get files in a some unknown dir of a share storage', async () => {
        expect(window.cvat.server.share('Unknown Directory')).rejects.toThrow(window.cvat.exceptions.ServerError);
    });
});

describe('Feature: get annotation formats', () => {
    test('get annotation formats from a server', async () => {
        const result = await window.cvat.server.formats();
        expect(result).toBeInstanceOf(AnnotationFormats);
    });
});

describe('Feature: get annotation loaders', () => {
    test('get annotation formats from a server', async () => {
        const result = await window.cvat.server.formats();
        expect(result).toBeInstanceOf(AnnotationFormats);
        const { loaders } = result;
        expect(Array.isArray(loaders)).toBeTruthy();
        for (const loader of loaders) {
            expect(loader).toBeInstanceOf(Loader);
        }
    });
});

describe('Feature: get annotation dumpers', () => {
    test('get annotation formats from a server', async () => {
        const result = await window.cvat.server.formats();
        expect(result).toBeInstanceOf(AnnotationFormats);
        const { dumpers } = result;
        expect(Array.isArray(dumpers)).toBeTruthy();
        for (const dumper of dumpers) {
            expect(dumper).toBeInstanceOf(Dumper);
        }
    });
});
