// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for sso
jest.mock('../../src/sso-manager', () => {
    return require('../mocks/sso.mock')
});

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    return {
        __esModule: true,
        default: require('../mocks/server-proxy.mock'),
    };
});

// Initialize api
window.cvat = require('../../src/api');

// Test cases
describe('Feature: validate OAuth2 code', () => {
    test('validate oauth2 code', async () => {
        const code = 'test';
        const result = await window.cvat.sso.validate(code);
        expect(result).toBeInstanceOf(Object);
        expect('token' in result).toBeTruthy();
        expect('expireAt' in result).toBeTruthy();
    });
});