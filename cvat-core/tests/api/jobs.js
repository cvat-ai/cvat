// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

// Initialize api
window.cvat = require('../../src/api');

const { Job } = require('../../src/session');

// Test cases
describe('Feature: get a list of jobs', () => {
    test('get jobs by a task id', async () => {
        const result = await window.cvat.jobs.get({
            taskID: 3,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(2);
        for (const el of result) {
            expect(el).toBeInstanceOf(Job);
        }

        expect(result[0].taskId).toBe(3);
        expect(result[0].taskId).toBe(result[1].taskId);
    });

    test('get jobs by an unknown task id', async () => {
        const result = await window.cvat.jobs.get({
            taskID: 50,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get jobs by a job id', async () => {
        const result = await window.cvat.jobs.get({
            jobID: 1,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    test('get jobs by an unknown job id', async () => {
        const result = await window.cvat.jobs.get({
            taskID: 50,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get jobs by invalid filter with both taskID and jobID', async () => {
        expect(
            window.cvat.jobs.get({
                taskID: 1,
                jobID: 1,
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get jobs by invalid job id', async () => {
        expect(
            window.cvat.jobs.get({
                jobID: '1',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get jobs by invalid task id', async () => {
        expect(
            window.cvat.jobs.get({
                taskID: '1',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get jobs by unknown filter', async () => {
        expect(
            window.cvat.jobs.get({
                unknown: 50,
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: save job', () => {
    test('save stage and state of a job', async () => {
        const result = await window.cvat.jobs.get({
            jobID: 1,
        });

        result[0].stage = 'validation';
        result[0].state = 'new';
        const newJob = await result[0].save();

        expect(newJob.stage).toBe('validation');
        expect(newJob.state).toBe('new');
    });

    test('save invalid status of a job', async () => {
        const result = await window.cvat.jobs.get({
            jobID: 1,
        });

        expect(() => {
            result[0].state = 'invalid';
        }).toThrow(window.cvat.exceptions.ArgumentError);
        expect(() => {
            result[0].stage = 'invalid';
        }).toThrow(window.cvat.exceptions.ArgumentError);
    });
});
