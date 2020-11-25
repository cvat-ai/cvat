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

const User = require('../../src/user');

// Test cases
describe('Feature: get a list of users', () => {
    test('get all users', async () => {
        const result = await window.cvat.users.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(2);
        for (const el of result) {
            expect(el).toBeInstanceOf(User);
        }
    });

    test('get only self', async () => {
        const result = await window.cvat.users.get({
            self: true,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(User);
    });

    test('get users with unknown filter key', async () => {
        expect(
            window.cvat.users.get({
                unknown: '50',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get users with invalid filter key', async () => {
        expect(
            window.cvat.users.get({
                self: 1,
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});
