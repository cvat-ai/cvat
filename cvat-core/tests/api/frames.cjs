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
const { FrameData } = require('../../src/frames');

describe('Feature: get frame meta', () => {
    test('get meta for a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const frame = await task.frames.get(0);
        expect(frame).toBeInstanceOf(FrameData);
    });

    test('get meta for a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const frame = await job.frames.get(0);
        expect(frame).toBeInstanceOf(FrameData);
    });

    test('pass frame number out of a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get(100)).rejects.toThrow(cvat.exceptions.ArgumentError);
        expect(task.frames.get(-1)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('pass bad frame number', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get('5')).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('do not pass any frame number', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get()).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: delete/restore frame', () => {
    test('delete frame from job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        await job.annotations.clear(true);
        let frame = await job.frames.get(0);
        expect(frame.deleted).toBe(false);
        await job.frames.delete(0);
        frame = await job.frames.get(0);
        expect(frame.deleted).toBe(true);
    });

    test('restore frame from job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        await job.annotations.clear(true);
        let frame = await job.frames.get(8);
        expect(frame.deleted).toBe(true);
        await job.frames.restore(8);
        frame = await job.frames.get(8);
        expect(frame.deleted).toBe(false);
    });

    test('delete frame from task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        let frame = await task.frames.get(1);
        expect(frame.deleted).toBe(false);
        await task.frames.delete(1);
        frame = await task.frames.get(1);
        expect(frame.deleted).toBe(true);
    });

    test('restore frame from task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        let frame = await task.frames.get(7);
        expect(frame.deleted).toBe(true);
        await task.frames.restore(7);
        frame = await task.frames.get(7);
        expect(frame.deleted).toBe(false);
    });
});

describe('Feature: get frame preview', () => {
    test('get frame preview for a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const frame = await task.frames.preview();
        expect(typeof frame).toBe('string');
    });

    test('get frame preview for a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const frame = await job.frames.preview();
        expect(typeof frame).toBe('string');
    });
});
