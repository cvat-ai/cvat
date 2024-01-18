// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    return {
        __esModule: true,
        default: require('../mocks/server-proxy.mock.cjs'),
    };
});

const cvat = require('../../src/api').default;
const User = require('../../src/user').default;

// Test cases
describe('Feature: get a list of users', () => {
    test('get all users', async () => {
        const result = await cvat.users.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(2);
        for (const el of result) {
            expect(el).toBeInstanceOf(User);
        }
    });

    test('get only self', async () => {
        const result = await cvat.users.get({
            self: true,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(User);
    });

    test('get users with unknown filter key', async () => {
        expect(
            cvat.users.get({
                unknown: '50',
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('get users with invalid filter key', async () => {
        expect(
            cvat.users.get({
                self: 1,
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});
