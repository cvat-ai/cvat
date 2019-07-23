/*
 * Copyright (C) 2018 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* global
    require:false
    jest:false
    describe:false
*/

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

// Initialize api
require('../../src/api');

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
        expect(window.cvat.server.share(
            'Unknown Directory',
        )).rejects.toThrow(window.cvat.exceptions.ServerError);
    });
});
