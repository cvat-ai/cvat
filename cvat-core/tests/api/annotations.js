/*
 * Copyright (C) 2018-2020 Intel Corporation
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
const serverProxy = require('../../src/server-proxy');

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
        expect(task.annotations.get(500))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        // Out of task
        expect(task.annotations.get(-1))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get annotations for frame out of job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 101 }))[0];

        // Out of segment
        expect(job.annotations.get(500))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        // Out of segment
        expect(job.annotations.get(-1))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    // TODO: Test filter (hasn't been implemented yet)
});


describe('Feature: put annotations', () => {
    test('put a shape to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(1);
        const { length } = annotations;

        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        await task.annotations.put([state]);
        annotations = await task.annotations.get(1);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a shape to a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        const { length } = annotations;

        const state = new window.cvat.classes.ObjectState({
            frame: 5,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.RECTANGLE,
            points: [0, 0, 100, 100],
            occluded: false,
            label: job.task.labels[0],
            zOrder: 0,
        });

        await job.annotations.put([state]);
        annotations = await job.annotations.get(5);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a track to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(1);
        const { length } = annotations;

        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.TRACK,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        await task.annotations.put([state]);
        annotations = await task.annotations.get(1);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a track to a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        const { length } = annotations;

        const state = new window.cvat.classes.ObjectState({
            frame: 5,
            objectType: window.cvat.enums.ObjectType.TRACK,
            shapeType: window.cvat.enums.ObjectShape.RECTANGLE,
            points: [0, 0, 100, 100],
            occluded: false,
            label: job.task.labels[0],
            zOrder: 0,
        });

        await job.annotations.put([state]);
        annotations = await job.annotations.get(5);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put object without objectType to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape with bad attributes to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape with bad zOrder to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: 'bad value',
        });

        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        const state1 = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: NaN,
        });

        expect(task.annotations.put([state1]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape without points and with invalud points to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            occluded: true,
            points: [],
            label: task.labels[0],
            zOrder: 0,
        });

        await expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.DataError);

        delete state.points;
        await expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.DataError);

        state.points = ['150,50 250,30'];
        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape without type to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape without label and with bad label to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: 1,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            zOrder: 0,
        });

        await expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        state.label = 'bad label';
        await expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);

        state.label = {};
        await expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('put shape with bad frame to a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new window.cvat.classes.ObjectState({
            frame: '5',
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: check unsaved changes', () => {
    test('check unsaved changes in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        const annotations = await task.annotations.get(0);

        annotations[0].keyframe = false;
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
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        await task.annotations.put([state]);
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        annotations = await task.annotations.get(0);
        expect(annotations).toHaveLength(length + 1);
    });

    test('update & save annotations for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete();
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('create & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        const { length } = annotations;
        const state = new window.cvat.classes.ObjectState({
            frame: 0,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: job.task.labels[0],
            zOrder: 0,
        });

        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        await job.annotations.put([state]);
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        annotations = await job.annotations.get(0);
        expect(annotations).toHaveLength(length + 1);
    });

    test('update & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].points = [0, 100, 200, 300];
        await annotations[0].save();
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete();
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a job when there are a track and a shape with the same id', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 112 }))[0];
        const annotations = await job.annotations.get(0);
        let okay = false;

        // Temporary override this method because we need to know what data
        // have been sent to a server
        const oldImplementation = serverProxy.annotations.updateAnnotations;
        serverProxy.annotations.updateAnnotations = async (session, id, data, action) => {
            const result = await oldImplementation
                .call(serverProxy.annotations, session, id, data, action);
            if (action === 'delete') {
                okay = okay || (action === 'delete' && !!(data.shapes.length || data.tracks.length));
            }
            return result;
        };

        await annotations[0].delete();
        await job.annotations.save();

        serverProxy.annotations.updateAnnotations = oldImplementation;
        expect(okay).toBe(true);
    });
});

describe('Feature: merge annotations', () => {
    test('merge annotations in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        await task.annotations.merge(states);
        const merged0 = (await task.annotations.get(0))
            .filter((state) => state.objectType === window.cvat.enums.ObjectType.TRACK);
        const merged1 = (await task.annotations.get(1))
            .filter((state) => state.objectType === window.cvat.enums.ObjectType.TRACK);
        expect(merged0).toHaveLength(1);
        expect(merged1).toHaveLength(1);

        expect(merged0[0].points).toEqual(states[0].points);
        expect(merged1[0].points).toEqual(states[1].points);
    });

    test('merge annotations in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations0 = await job.annotations.get(0);
        const annotations1 = await job.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        await job.annotations.merge(states);
        const merged0 = (await job.annotations.get(0))
            .filter((state) => state.objectType === window.cvat.enums.ObjectType.TRACK);
        const merged1 = (await job.annotations.get(1))
            .filter((state) => state.objectType === window.cvat.enums.ObjectType.TRACK);
        expect(merged0).toHaveLength(1);
        expect(merged1).toHaveLength(1);

        expect(merged0[0].points).toEqual(states[0].points);
        expect(merged1[0].points).toEqual(states[1].points);
    });

    test('trying to merge not object state', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const states = [annotations0[0], {}];

        expect(task.annotations.merge(states))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to merge object state which is not saved in a collection', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);

        const state = new window.cvat.classes.ObjectState({
            frame: 0,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
        });
        const states = [annotations0[0], state];

        expect(task.annotations.merge(states))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to merge with bad label', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        states[0].label = new window.cvat.classes.Label({
            id: 500,
            name: 'new_label',
            attributes: [],
        });

        expect(task.annotations.merge(states))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to merge with different shape types', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = (await task.annotations.get(1))
            .filter((state) => state.shapeType === window.cvat.enums.ObjectShape.POLYGON);
        const states = [annotations0[0], annotations1[0]];

        expect(task.annotations.merge(states))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to merge with different labels', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        states[1].label = new window.cvat.classes.Label({
            id: 500,
            name: 'new_label',
            attributes: [],
        });

        expect(task.annotations.merge(states))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: split annotations', () => {
    test('split annotations in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations4 = await task.annotations.get(4);
        const annotations5 = await task.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        await task.annotations.split(annotations5[0], 5);
        const splitted4 = await task.annotations.get(4);
        const splitted5 = (await task.annotations.get(5)).filter((state) => !state.outside);
        expect(splitted4[0].clientID).not.toBe(splitted5[0].clientID);
    });

    test('split annotations in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 101 }))[0];
        const annotations4 = await job.annotations.get(4);
        const annotations5 = await job.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        await job.annotations.split(annotations5[0], 5);
        const splitted4 = await job.annotations.get(4);
        const splitted5 = (await job.annotations.get(5)).filter((state) => !state.outside);
        expect(splitted4[0].clientID).not.toBe(splitted5[0].clientID);
    });

    test('split on a bad frame', async () => {
        const task = (await window.cvat.tasks.get({ id: 101 }))[0];
        const annotations4 = await task.annotations.get(4);
        const annotations5 = await task.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        expect(task.annotations.split(annotations5[0], 'bad frame'))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: group annotations', () => {
    test('group annotations in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        const groupID = await task.annotations.group(annotations);
        expect(typeof (groupID)).toBe('number');
        annotations = await task.annotations.get(0);
        for (const state of annotations) {
            expect(state.group.id).toBe(groupID);
        }
    });

    test('group annotations in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        const groupID = await job.annotations.group(annotations);
        expect(typeof (groupID)).toBe('number');
        annotations = await job.annotations.get(0);
        for (const state of annotations) {
            expect(state.group.id).toBe(groupID);
        }
    });

    test('trying to group object state which has not been saved in a collection', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);

        const state = new window.cvat.classes.ObjectState({
            frame: 0,
            objectType: window.cvat.enums.ObjectType.SHAPE,
            shapeType: window.cvat.enums.ObjectShape.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.group([state]))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to group not object state', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.group(annotations.concat({})))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: clear annotations', () => {
    test('clear annotations in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        await task.annotations.clear();
        annotations = await task.annotations.get(0);
        expect(annotations.length).toBe(0);
    });

    test('clear annotations in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        await job.annotations.clear();
        annotations = await job.annotations.get(0);
        expect(annotations.length).toBe(0);
    });

    test('clear annotations with reload in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.clear(true);
        annotations = await task.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('clear annotations with reload in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.clear(true);
        annotations = await job.annotations.get(0);
        expect(annotations.length).not.toBe(0);
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('clear annotations with bad reload parameter', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        expect(task.annotations.clear('reload'))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: get statistics', () => {
    test('get statistics from a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        const statistics = await task.annotations.statistics();
        expect(statistics).toBeInstanceOf(window.cvat.classes.Statistics);
        expect(statistics.total.total).toBe(29);
    });

    test('get statistics from a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 101 }))[0];
        await job.annotations.clear(true);
        const statistics = await job.annotations.statistics();
        expect(statistics).toBeInstanceOf(window.cvat.classes.Statistics);
        expect(statistics.total.total).toBe(512);
    });
});

describe('Feature: select object', () => {
    test('select object in a task', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        let result = await task.annotations.select(annotations, 1430, 765);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.RECTANGLE);
        result = await task.annotations.select(annotations, 1415, 765);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.POLYGON);
        expect(result.state.points.length).toBe(10);
        result = await task.annotations.select(annotations, 1083, 543);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.POINTS);
        expect(result.state.points.length).toBe(16);
        result = await task.annotations.select(annotations, 613, 811);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.POLYGON);
        expect(result.state.points.length).toBe(94);
    });

    test('select object in a job', async () => {
        const job = (await window.cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);
        let result = await job.annotations.select(annotations, 490, 540);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.RECTANGLE);
        result = await job.annotations.select(annotations, 430, 260);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.POLYLINE);
        result = await job.annotations.select(annotations, 1473, 250);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.RECTANGLE);
        result = await job.annotations.select(annotations, 1490, 237);
        expect(result.state.shapeType).toBe(window.cvat.enums.ObjectShape.POLYGON);
        expect(result.state.points.length).toBe(94);
    });

    test('trying to select from not object states', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.select(annotations.concat({}), 500, 500))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('trying to select with invalid coordinates', async () => {
        const task = (await window.cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.select(annotations, null, null))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
        expect(task.annotations.select(annotations, null, null))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
        expect(task.annotations.select(annotations, '5', '10'))
            .rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});
