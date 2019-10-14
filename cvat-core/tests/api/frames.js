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
window.cvat = require('../../src/api');

const { FrameData } = require('../../src/frames');

describe('Feature: get frame meta', () => {
    test('get meta for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const frame = await task.frames.get(0);
        expect(frame).toBeInstanceOf(FrameData);
    });

    test('get meta for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const frame = await job.frames.get(0);
        expect(frame).toBeInstanceOf(FrameData);
    });

    test('pass frame number out of a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get(100))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
        expect(task.frames.get(-1))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('pass bad frame number', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get('5'))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('do not pass any frame number', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        expect(task.frames.get())
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: get frame data', () => {
    test('get frame data for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const frame = await task.frames.get(0);
        const frameData = await frame.data();
        expect(typeof (frameData)).toBe('string');
    });

    test('get frame data for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const frame = await job.frames.get(0);
        const frameData = await frame.data();
        expect(typeof (frameData)).toBe('string');
    });
});

describe('Feature: get frame preview', () => {
    test('get frame preview for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const frame = await task.frames.preview();
        expect(typeof (frame)).toBe('string');
    });

    test('get frame preview for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const frame = await job.frames.preview();
        expect(typeof (frame)).toBe('string');
    });
});
