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

describe('Feature: set attributes for object state', () => {
    test('get meta for a job', async () => {

    });
});

describe('Feature: set points for object state', () => {
    test('get meta for a task', async () => {

    });
});

describe('Feature: save object state', () => {
    test('get meta for a task', async () => {

    });
});
