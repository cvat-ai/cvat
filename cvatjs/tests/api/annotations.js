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
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(11);
        for (const state of annotations) {
            expect(state).toBeInstanceOf(window.cvat.classes.ObjectState);
        }
    });

    test('get annotations from a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 101 }))[0];
        const annotations0 = await job.annotations.get(0);
        const annotations10 = await job.annotations.get(10);
        expect(Array.isArray(annotations0)).toBeTruthy();
        expect(Array.isArray(annotations10)).toBeTruthy();
        expect(annotations0).toHaveLength(1);
        expect(annotations10).toHaveLength(2);
        for (const state of annotations0.concat(annotations10)) {
            expect(state).toBeInstanceOf(window.cvat.classes.ObjectState);
        }
    });

    test('get annotations for frame out of task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];

        // Out of task
        await expect(task.annotations.get(500))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        // Out of task
        await expect(task.annotations.get(-1))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get annotations for frame out of job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 101 }))[0];

        // Out of segment
        await expect(job.annotations.get(500))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        // Out of segment
        await expect(job.annotations.get(-1))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    // TODO: Test filter (hasn't been implemented yet)
});


describe('Feature: put annotations', () => {
    test('put annotations to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(1);
        const { length } = annotations;

        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            attributes: {},
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            group: 0,
            zOrder: 0,
        });

        await task.annotations.put([state]);
        annotations = await task.annotations.get(1);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put annotations to a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(2);

        const state = new window.cvat.classes.ObjectState({
            frame: 5,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.RECTANGLE,
            attributes: {},
            points: [0, 0, 100, 100],
            occluded: false,
            label: job.task.labels[0],
            group: 0,
            zOrder: 0,
        });

        await job.annotations.put([state]);
        annotations = await job.annotations.get(5);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(3);
    });

    // TODO: Put with invalid arguments (2-3 tests)
});

describe('Feature: check unsaved changes', () => {
    test('check unsaved changes in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        const annotations = await task.annotations.get(0);

        annotations[0].keyframe = true;
        await annotations[0].save();

        expect(await task.annotations.hasUnsavedChanges()).toBe(true);
    });

    test('check unsaved changes in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        const annotations = await job.annotations.get(0);

        annotations[0].occluded = true;
        await annotations[0].save();

        expect(await job.annotations.hasUnsavedChanges()).toBe(true);
    });
});

describe('Feature: save annotations', () => {
    test('create & save annotations for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(0);
        const { length } = annotations;
        const state = new window.cvat.classes.ObjectState({
            frame: 0,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            attributes: {},
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            group: 0,
            zOrder: 0,
        });

        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        await task.annotations.put([state]);
        expect(await task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        annotations = await task.annotations.get(0);
        expect(annotations).toHaveLength(length + 1);
    });

    test('update & save annotations for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(await task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete();
        expect(await task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('create & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        const { length } = annotations;
        const state = new window.cvat.classes.ObjectState({
            frame: 0,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            attributes: {},
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: job.task.labels[0],
            group: 0,
            zOrder: 0,
        });

        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        await job.annotations.put([state]);
        expect(await job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        annotations = await job.annotations.get(0);
        expect(annotations).toHaveLength(length + 1);
    });

    test('update & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].points = [0, 100, 200, 300];
        await annotations[0].save();
        expect(await job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete();
        expect(await job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
    });
});

describe('Feature: merge annotations', () => {
    test('merge annotations in a task', async () => {

    });

    test('merge annotations in a job', async () => {

    });

    // TODO: merge with invalid parameters
    // Not object states
    // Created object state
});

describe('Feature: split annotations', () => {
    test('split annotations in a task', async () => {

    });

    test('split annotations in a job', async () => {

    });

    // TODO: split with invalid parameters (invalid frame, frame outside of shape etc.)
});

describe('Feature: group annotations', () => {
    test('group annotations in a task', async () => {

    });

    test('group annotations in a job', async () => {

    });

    // TODO: group with invalid parameters (some values are invalid)
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

    // TODO: clear with invalid parameter (not a boolean)
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
    // frame outside of range
    // frame is not a number
    // invalid coordinates (not number)
});


// TODO: Tests for object state
// TODO: Tests for frames
