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
describe('Feature: get annotations', () => {
    test('get annotations from a task', async () => {
        // TODO:
    });

    test('get annotations from a job', async () => {
        // TODO:
    });

    // TODO: Test filter
});


describe('Feature: put annotations', () => {
    test('put annotations from a task', async () => {

    });

    test('put annotations from a job', async () => {

    });

    // TODO: Put with invalid arguments (2-3 tests)
});

describe('Feature: check unsaved changes', () => {
    test('check unsaved changes in a task', async () => {

    });

    test('check unsaved changes in a job', async () => {

    });
});

describe('Feature: save annotations', () => {
    test('save annotations from a task', async () => {

    });

    test('save annotations from a job', async () => {

    });
});

describe('Feature: merge annotations', () => {
    test('merge annotations in a task', async () => {

    });

    test('merge annotations in a job', async () => {

    });

    // TODO: merge with invalid parameters
});

describe('Feature: split annotations', () => {
    test('split annotations in a task', async () => {

    });

    test('split annotations in a job', async () => {

    });

    // TODO: split with invalid parameters
});

describe('Feature: group annotations', () => {
    test('group annotations in a task', async () => {

    });

    test('group annotations in a job', async () => {

    });

    // TODO: group with invalid parameters
});

describe('Feature: clear annotations', () => {
    test('clear annotations in a task', async () => {

    });

    test('clear annotations in a job', async () => {

    });

    test('clear annotations with reload in a task', async () => {

    });

    test('clear annotations with reload in a job', async () => {

    });

    // TODO: clear with invalid parameter
});

describe('Feature: get statistics', () => {
    test('get statistics from a task', async () => {

    });

    test('get statistics from a job', async () => {

    });
});

describe('Feature: select object', () => {
    test('select object in a task', async () => {

    });

    test('select object in a job', async () => {

    });

    // TODO: select with invalid parameters
});
