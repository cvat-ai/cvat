// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
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
const serverProxy = require('../../src/server-proxy').default;

// Test cases
describe('Feature: get annotations', () => {
    test('get annotations from a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(12);
        for (const state of annotations) {
            expect(state).toBeInstanceOf(cvat.classes.ObjectState);
        }
    });

    test('get annotations from a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 101 }))[0];
        const annotations0 = await job.annotations.get(0);
        const annotations10 = await job.annotations.get(10);
        expect(Array.isArray(annotations0)).toBeTruthy();
        expect(Array.isArray(annotations10)).toBeTruthy();
        expect(annotations0).toHaveLength(2);
        expect(annotations10).toHaveLength(3);
        for (const state of annotations0.concat(annotations10)) {
            expect(state).toBeInstanceOf(cvat.classes.ObjectState);
        }
    });

    test('get annotations for frame out of task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];

        // Out of task
        expect(task.annotations.get(500)).rejects.toThrow(cvat.exceptions.ArgumentError);

        // Out of task
        expect(task.annotations.get(-1)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('get annotations for frame out of job', async () => {
        const job = (await cvat.jobs.get({ jobID: 101 }))[0];

        // Out of segment
        expect(job.annotations.get(500)).rejects.toThrow(cvat.exceptions.ArgumentError);

        // Out of segment
        expect(job.annotations.get(-1)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('get only ellipses', async () => {
        const job = (await cvat.jobs.get({ jobID: 101 }))[0];
        const annotations = await job.annotations.get(5, false, JSON.parse('[{"and":[{"==":[{"var":"shape"},"ellipse"]}]}]'));
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(1);
        expect(annotations[0].shapeType).toBe('ellipse');
    });

    test('get skeletons with a filter', async () => {
        const job = (await cvat.jobs.get({ jobID: 40 }))[0];
        const annotations = await job.annotations.get(0, false, JSON.parse('[{"and":[{"==":[{"var":"shape"},"skeleton"]}]}]'));
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(2);
        for (const object of annotations) {
            expect(object.shapeType).toBe('skeleton');
            expect(object.elements).toBeInstanceOf(Array);
            const label = object.label;
            let points = [];
            object.elements.forEach((element, idx) => {
                expect(element).toBeInstanceOf(cvat.classes.ObjectState);
                expect(element.label.id).toBe(label.structure.sublabels[idx].id);
                expect(element.shapeType).toBe('points');
                points = [...points, ...element.points];
            });
            expect(points).toEqual(object.points);
        }

        expect(annotations[0].shapeType).toBe('skeleton');
    })
});

describe('Feature: get interpolated annotations', () => {
    test('get interpolated box', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(5);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(2);

        const [xtl, ytl, xbr, ybr] = annotations[0].points;
        const { rotation } = annotations[0];

        expect(rotation).toBe(50);
        expect(Math.round(xtl)).toBe(332);
        expect(Math.round(ytl)).toBe(519);
        expect(Math.round(xbr)).toBe(651);
        expect(Math.round(ybr)).toBe(703);

        annotations = await task.annotations.get(15);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(3);
        expect(annotations[1].rotation).toBe(40);
        expect(annotations[1].shapeType).toBe('rectangle');

        annotations = await task.annotations.get(30);
        annotations[0].rotation = 20;
        await annotations[0].save();
        annotations = await task.annotations.get(25);
        expect(annotations[0].rotation).toBe(0);
        expect(annotations[0].shapeType).toBe('rectangle');
    });

    test('get interpolated ellipse', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(5);
        expect(Array.isArray(annotations)).toBeTruthy();
        expect(annotations).toHaveLength(2);
        expect(annotations[1].shapeType).toBe('ellipse');
        const [cx, cy, rightX, topY] = annotations[1].points;
        expect(Math.round(cx)).toBe(550);
        expect(Math.round(cy)).toBe(550);
        expect(Math.round(rightX)).toBe(900);
        expect(Math.round(topY)).toBe(150);
    });
});

describe('Feature: put annotations', () => {
    test('put a shape to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(1);
        const { length } = annotations;

        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        const indexes = await task.annotations.put([state]);
        annotations = await task.annotations.get(1);
        expect(indexes).toBeInstanceOf(Array);
        expect(indexes).toHaveLength(1);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a shape to a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        const { length } = annotations;

        const state = new cvat.classes.ObjectState({
            frame: 5,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            points: [0, 0, 100, 100],
            occluded: false,
            label: job.labels[0],
            zOrder: 0,
        });

        const indexes = await job.annotations.put([state]);
        expect(indexes).toBeInstanceOf(Array);
        expect(indexes).toHaveLength(1);
        annotations = await job.annotations.get(5);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put an ellipse shape to a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        const { length } = annotations;

        const state = new cvat.classes.ObjectState({
            frame: 5,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.ELLIPSE,
            points: [500, 500, 800, 100],
            occluded: true,
            label: job.labels[0],
            zOrder: 0,
        });

        const indexes = await job.annotations.put([state]);
        expect(indexes).toBeInstanceOf(Array);
        expect(indexes).toHaveLength(1);
        annotations = await job.annotations.get(5);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a track to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(1);
        const { length } = annotations;

        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.TRACK,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        const indexes = await task.annotations.put([state]);
        expect(indexes).toBeInstanceOf(Array);
        expect(indexes).toHaveLength(1);
        annotations = await task.annotations.get(1);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put a track to a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(5);
        const { length } = annotations;

        const state = new cvat.classes.ObjectState({
            frame: 5,
            objectType: cvat.enums.ObjectType.TRACK,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            points: [0, 0, 100, 100],
            occluded: false,
            label: job.labels[0],
            zOrder: 0,
        });

        const indexes = await job.annotations.put([state]);
        expect(indexes).toBeInstanceOf(Array);
        expect(indexes).toHaveLength(1);
        annotations = await job.annotations.get(5);
        expect(annotations).toHaveLength(length + 1);
    });

    test('put object without objectType to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        expect(() => new cvat.classes.ObjectState({
            frame: 1,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        })).toThrow(cvat.exceptions.ArgumentError);
    });

    test('put shape with bad attributes to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state])).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('put shape with bad zOrder to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: 'bad value',
        });

        expect(task.annotations.put([state])).rejects.toThrow(cvat.exceptions.ArgumentError);

        const state1 = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            attributes: { 'bad key': 55 },
            occluded: true,
            label: task.labels[0],
            zOrder: NaN,
        });

        expect(task.annotations.put([state1])).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('put shape without points and with invalid points to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(() => state.points = ['150,50 250,30']).toThrow(cvat.exceptions.ArgumentError);

        delete state.points;
        expect(task.annotations.put([state])).rejects.toThrow(cvat.exceptions.DataError);

        state.points = [];
        expect(task.annotations.put([state])).rejects.toThrow(cvat.exceptions.DataError);
    });

    test('put shape without type to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = new cvat.classes.ObjectState({
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.put([state])).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('put shape without label and with bad label to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        const state = {
            frame: 1,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            zOrder: 0,
        };

        expect(() => new cvat.classes.ObjectState(state))
            .toThrow(cvat.exceptions.ArgumentError);
        expect(() => new cvat.classes.ObjectState({ ...state, label: 'bad label' }))
            .toThrow(cvat.exceptions.ArgumentError);
        expect(() => new cvat.classes.ObjectState({ ...state, label: {} }))
            .toThrow(cvat.exceptions.ArgumentError);
    });

    test('put shape with bad frame to a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.clear(true);
        expect(() => new cvat.classes.ObjectState({
            frame: '5',
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        })).toThrow(cvat.exceptions.ArgumentError);
    });

    test('put a skeleton shape to a job', async() => {
        const job = (await cvat.jobs.get({ jobID: 40 }))[0];
        const label = job.labels[0];
        await job.annotations.clear(true);
        await job.annotations.clear();
        const skeleton = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.SKELETON,
            points: [],
            label,
            elements: label.structure.sublabels.map((sublabel, idx) => ({
                frame: 0,
                objectType: cvat.enums.ObjectType.SHAPE,
                shapeType: cvat.enums.ShapeType.POINTS,
                points: [idx * 10, idx * 10],
                label: sublabel,
            }))
        });

        await job.annotations.put([skeleton]);
        const annotations = await job.annotations.get(0);
        expect(annotations.length).toBe(1);
        expect(annotations[0].objectType).toBe(cvat.enums.ObjectType.SHAPE);
        expect(annotations[0].shapeType).toBe(cvat.enums.ShapeType.SKELETON);
        for (const element of annotations[0].elements) {
            expect(element.objectType).toBe(cvat.enums.ObjectType.SHAPE);
            expect(element.shapeType).toBe(cvat.enums.ShapeType.POINTS);
        }
    });

    test('put a skeleton track to a task', async() => {
        const task = (await cvat.tasks.get({ id: 40 }))[0];
        const label = task.labels[0];
        await task.annotations.clear(true);
        await task.annotations.clear();
        const skeleton = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.TRACK,
            shapeType: cvat.enums.ShapeType.SKELETON,
            points: [],
            label,
            elements: label.structure.sublabels.map((sublabel, idx) => ({
                frame: 0,
                objectType: cvat.enums.ObjectType.TRACK,
                shapeType: cvat.enums.ShapeType.POINTS,
                points: [idx * 10, idx * 10],
                label: sublabel,
            }))
        });

        await task.annotations.put([skeleton]);
        const annotations = await task.annotations.get(2);
        expect(annotations.length).toBe(1);
        expect(annotations[0].objectType).toBe(cvat.enums.ObjectType.TRACK);
        expect(annotations[0].shapeType).toBe(cvat.enums.ShapeType.SKELETON);
        for (const element of annotations[0].elements) {
            expect(element.objectType).toBe(cvat.enums.ObjectType.TRACK);
            expect(element.shapeType).toBe(cvat.enums.ShapeType.POINTS);
        }
    });
});

describe('Feature: check unsaved changes', () => {
    test('check unsaved changes in a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.get(0);
        expect(await task.annotations.hasUnsavedChanges()).toBe(false);
        const annotations = await task.annotations.get(0);

        annotations[0].keyframe = false;
        await annotations[0].save();

        expect(await task.annotations.hasUnsavedChanges()).toBe(true);
    });

    test('check unsaved changes in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        await job.annotations.get(0);
        expect(await job.annotations.hasUnsavedChanges()).toBe(false);
        const annotations = await job.annotations.get(0);

        annotations[0].occluded = true;
        await annotations[0].save();

        expect(await job.annotations.hasUnsavedChanges()).toBe(true);
    });
});

describe('Feature: save annotations', () => {
    test('create, save, undo, save, redo save', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        await task.annotations.get(0);
        const state = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        await task.annotations.put([state]);
        await task.annotations.save();
        await task.actions.undo();
        await task.annotations.save();
        await task.actions.redo();
        await task.annotations.save();
    });

    test('create & save annotations for a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        let annotations = await task.annotations.get(0);
        const { length } = annotations;
        const state = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
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
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);

        expect(task.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete(0);
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.save();
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('create & save annotations for a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        const { length } = annotations;
        const state = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: job.labels[0],
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
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        annotations[0].points = [0, 100, 200, 300];
        await annotations[0].save();
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);

        expect(job.annotations.hasUnsavedChanges()).toBe(false);
        await annotations[0].delete(0);
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.save();
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('delete & save annotations for a job when there are a track and a shape with the same id', async () => {
        const job = (await cvat.jobs.get({ jobID: 112 }))[0];
        const annotations = await job.annotations.get(0);
        let okay = false;

        // Temporary override this method because we need to know what data
        // have been sent to a server
        const oldImplementation = serverProxy.annotations.updateAnnotations;
        serverProxy.annotations.updateAnnotations = async (session, id, data, action) => {
            const result = await oldImplementation.call(serverProxy.annotations, session, id, data, action);
            if (action === 'delete') {
                okay = okay || (action === 'delete' && !!(data.shapes.length || data.tracks.length));
            }
            return result;
        };

        await annotations[0].delete(0);
        await job.annotations.save();

        serverProxy.annotations.updateAnnotations = oldImplementation;
        expect(okay).toBe(true);
    });
});

describe('Feature: merge annotations', () => {
    test('merge annotations in a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        await task.annotations.merge(states);
        const merged0 = (await task.annotations.get(0)).filter(
            (state) => state.objectType === cvat.enums.ObjectType.TRACK,
        );
        const merged1 = (await task.annotations.get(1)).filter(
            (state) => state.objectType === cvat.enums.ObjectType.TRACK,
        );
        expect(merged0).toHaveLength(1);
        expect(merged1).toHaveLength(1);

        expect(merged0[0].points).toEqual(states[0].points);
        expect(merged1[0].points).toEqual(states[1].points);
    });

    test('merge annotations in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const annotations0 = await job.annotations.get(0);
        const annotations1 = await job.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        await job.annotations.merge(states);
        const merged0 = (await job.annotations.get(0)).filter(
            (state) => state.objectType === cvat.enums.ObjectType.TRACK,
        );
        const merged1 = (await job.annotations.get(1)).filter(
            (state) => state.objectType === cvat.enums.ObjectType.TRACK,
        );
        expect(merged0).toHaveLength(1);
        expect(merged1).toHaveLength(1);

        expect(merged0[0].points).toEqual(states[0].points);
        expect(merged1[0].points).toEqual(states[1].points);
    });

    test('trying to merge not object state', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const states = [annotations0[0], {}];

        expect(task.annotations.merge(states)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to merge object state which is not saved in a collection', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);

        const state = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
        });
        const states = [annotations0[0], state];

        expect(task.annotations.merge(states)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to merge with bad label', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        states[0].label = new cvat.classes.Label({
            id: 500,
            name: 'new_label',
            attributes: [],
        });

        expect(task.annotations.merge(states)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to merge with different shape types', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = (await task.annotations.get(1)).filter(
            (state) => state.shapeType === cvat.enums.ShapeType.POLYGON,
        );
        const states = [annotations0[0], annotations1[0]];

        expect(task.annotations.merge(states)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to merge with different labels', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations0 = await task.annotations.get(0);
        const annotations1 = await task.annotations.get(1);
        const states = [annotations0[0], annotations1[0]];
        states[1].label = new cvat.classes.Label({
            id: 500,
            name: 'new_label',
            attributes: [],
        });
        await states[1].save();

        expect(task.annotations.merge(states)).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: split annotations', () => {
    test('split annotations in a task', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations4 = await task.annotations.get(4);
        const annotations5 = await task.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        await task.annotations.split(annotations5[0], 5);
        const splitted4 = await task.annotations.get(4);
        const splitted5 = (await task.annotations.get(5)).filter((state) => !state.outside);
        expect(splitted4[1].clientID).not.toBe(splitted5[1].clientID);
    });

    test('split annotations in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 101 }))[0];
        const annotations4 = await job.annotations.get(4);
        const annotations5 = await job.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        await job.annotations.split(annotations5[0], 5);
        const splitted4 = await job.annotations.get(4);
        const splitted5 = (await job.annotations.get(5)).filter((state) => !state.outside);
        expect(splitted4[1].clientID).not.toBe(splitted5[1].clientID);
    });

    test('split on a bad frame', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations4 = await task.annotations.get(4);
        const annotations5 = await task.annotations.get(5);

        expect(annotations4[0].clientID).toBe(annotations5[0].clientID);
        expect(task.annotations.split(annotations5[0], 'bad frame')).rejects.toThrow(
            cvat.exceptions.ArgumentError,
        );
    });
});

describe('Feature: group annotations', () => {
    test('group annotations in a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        const groupID = await task.annotations.group(annotations);
        expect(typeof groupID).toBe('number');
        annotations = await task.annotations.get(0);
        for (const state of annotations) {
            expect(state.group.id).toBe(groupID);
        }
    });

    test('group annotations in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        const groupID = await job.annotations.group(annotations);
        expect(typeof groupID).toBe('number');
        annotations = await job.annotations.get(0);
        for (const state of annotations) {
            expect(state.group.id).toBe(groupID);
        }
    });

    test('trying to group object state which has not been saved in a collection', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);

        const state = new cvat.classes.ObjectState({
            frame: 0,
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.POLYGON,
            points: [0, 0, 100, 0, 100, 50],
            occluded: true,
            label: task.labels[0],
            zOrder: 0,
        });

        expect(task.annotations.group([state])).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to group not object state', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.group(annotations.concat({}))).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: clear annotations', () => {
    test('clear annotations in a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        await task.annotations.clear();
        annotations = await task.annotations.get(0);
        expect(annotations).toHaveLength(0);
    });

    test('clear annotations in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        await job.annotations.clear();
        annotations = await job.annotations.get(0);
        expect(annotations).toHaveLength(0);
    });

    test('clear annotations with reload in a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        let annotations = await task.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(task.annotations.hasUnsavedChanges()).toBe(true);
        await task.annotations.clear(true);
        annotations = await task.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        expect(task.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('clear annotations with reload in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        let annotations = await job.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        annotations[0].occluded = true;
        await annotations[0].save();
        expect(job.annotations.hasUnsavedChanges()).toBe(true);
        await job.annotations.clear(true);
        annotations = await job.annotations.get(0);
        expect(annotations).not.toHaveLength(0);
        expect(job.annotations.hasUnsavedChanges()).toBe(false);
    });

    test('clear annotations with bad reload parameter', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        expect(task.annotations.clear('reload')).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: get statistics', () => {
    test('get statistics from a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        await task.annotations.clear(true);
        const statistics = await task.annotations.statistics();
        expect(statistics).toBeInstanceOf(cvat.classes.Statistics);
        expect(statistics.total.total).toBe(30);
    });

    test('get statistics from a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 101 }))[0];
        await job.annotations.clear(true);
        const statistics = await job.annotations.statistics();
        expect(statistics).toBeInstanceOf(cvat.classes.Statistics);
        expect(statistics.total.total).toBe(1012);
    });

    test('get statistics from a job with skeletons', async () => {
        const job = (await cvat.jobs.get({ jobID: 40 }))[0];
        await job.annotations.clear(true);
        const statistics = await job.annotations.statistics();
        expect(statistics).toBeInstanceOf(cvat.classes.Statistics);
        expect(statistics.total.total).toBe(30);
        const labelName = job.labels[0].name;
        expect(statistics.label[labelName].skeleton.shape).toBe(1);
        expect(statistics.label[labelName].skeleton.track).toBe(1);
        expect(statistics.label[labelName].manually).toBe(2);
        expect(statistics.label[labelName].interpolated).toBe(3);
        expect(statistics.label[labelName].total).toBe(5);
    });

    test('get statistics from a job with skeletons', async () => {
        const job = (await cvat.jobs.get({ jobID: 102 }))[0];
        await job.annotations.clear(true);
        let statistics = await job.annotations.statistics();
        expect(statistics.total.manually).toBe(5);
        expect(statistics.total.interpolated).toBe(443);
        expect(statistics.total.tag).toBe(1);
        expect(statistics.total.rectangle.shape).toBe(1);
        expect(statistics.total.rectangle.track).toBe(1);
        await job.frames.delete(500); // track frame
        await job.frames.delete(510); // rectangle shape frame
        await job.frames.delete(550); // the first keyframe of a track
        statistics = await job.annotations.statistics();
        expect(statistics.total.manually).toBe(2);
        expect(statistics.total.tag).toBe(0);
        expect(statistics.total.rectangle.shape).toBe(0);
        expect(statistics.total.interpolated).toBe(394);
        await job.frames.delete(650); // intermediate frame in a track
        statistics = await job.annotations.statistics();
        expect(statistics.total.interpolated).toBe(393);
        await job.close();
    });
});

describe('Feature: select object', () => {
    test('select object in a task', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        let result = await task.annotations.select(annotations, 1430, 765);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.RECTANGLE);
        result = await task.annotations.select(annotations, 1415, 765);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.POLYGON);
        expect(result.state.points).toHaveLength(10);
        result = await task.annotations.select(annotations, 1083, 543);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.POINTS);
        expect(result.state.points).toHaveLength(16);
        result = await task.annotations.select(annotations, 613, 811);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.POLYGON);
        expect(result.state.points).toHaveLength(94);
        result = await task.annotations.select(annotations, 600, 900);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.CUBOID);
        expect(result.state.points).toHaveLength(16);
    });

    test('select object in a job', async () => {
        const job = (await cvat.jobs.get({ jobID: 100 }))[0];
        const annotations = await job.annotations.get(0);
        let result = await job.annotations.select(annotations, 490, 540);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.RECTANGLE);
        result = await job.annotations.select(annotations, 430, 260);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.POLYLINE);
        result = await job.annotations.select(annotations, 1473, 250);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.RECTANGLE);
        result = await job.annotations.select(annotations, 1490, 237);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.POLYGON);
        expect(result.state.points).toHaveLength(94);
        result = await job.annotations.select(annotations, 600, 900);
        expect(result.state.shapeType).toBe(cvat.enums.ShapeType.CUBOID);
        expect(result.state.points).toHaveLength(16);
    });

    test('trying to select from not object states', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.select(annotations.concat({}), 500, 500)).rejects.toThrow(
            cvat.exceptions.ArgumentError,
        );
    });

    test('trying to select with invalid coordinates', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        expect(task.annotations.select(annotations, null, null)).rejects.toThrow(cvat.exceptions.ArgumentError);
        expect(task.annotations.select(annotations, null, null)).rejects.toThrow(cvat.exceptions.ArgumentError);
        expect(task.annotations.select(annotations, '5', '10')).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: search frame', () => {
    test('applying different filters', async () => {
        const job = (await cvat.jobs.get({ jobID: 102 }))[0];
        await job.annotations.clear(true);
        let frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"tag"]}]}]') });
        expect(frame).toBe(500);
        frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"tag"]},{"==":[{"var":"label"},"bicycle"]}]}]') });
        expect(frame).toBe(500);
        frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"track"]},{"==":[{"var":"label"},"bicycle"]}]}]') });
        expect(frame).toBe(null);

        frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"shape"]},{"==":[{"var":"shape"},"rectangle"]}]}]') });
        expect(frame).toBe(510);
        frame = await job.annotations.search(511, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"shape"]},{"==":[{"var":"shape"},"rectangle"]}]}]') });
        expect(frame).toBe(null);
        frame = await job.annotations.search(511, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"type"},"shape"]},{"==":[{"var":"shape"},"polygon"]}]}]') });
        expect(frame).toBe(520);
        frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"attr.motorcycle.model"},"some text for test"]}]}]') });
        expect(frame).toBe(520);
        frame = await job.annotations.search(495, 994, { annotationsFilters: JSON.parse('[{"and":[{"==":[{"var":"attr.motorcycle.model"},"some text for test"]},{"==":[{"var":"shape"},"ellipse"]}]}]') });
        expect(frame).toBe(null);

        frame = await job.annotations.search(540, 994, { annotationsFilters: JSON.parse('[{"and":[{"<=":[450,{"var":"width"},550]}]}]') });
        expect(frame).toBe(563);
        frame = await job.annotations.search(588, 994, { annotationsFilters: JSON.parse('[{"and":[{"<=":[450,{"var":"width"},550]}]}]') });
        expect(frame).toBe(null);
        frame = await job.annotations.search(540, 994, { annotationsFilters: JSON.parse('[{"and":[{">=":[{"var":"width"},500]},{"<=":[{"var":"height"},300]}]}]') });
        expect(frame).toBe(575);
    });
});
