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

describe('Feature: set attributes for an object state', () => {
    test('set a valid value', () => {
        const state = new cvat.classes.ObjectState({
            label: new cvat.classes.Label({ name: 'test label', id: 1, color: '#000000', attributes: [] }),
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            frame: 5,
        });

        const attributes = {
            5: 'man',
            6: 'glasses',
        };

        state.attributes = attributes;
        expect(state.attributes).toEqual(attributes);
    });

    test('trying to set a bad value', () => {
        const state = new cvat.classes.ObjectState({
            label: new cvat.classes.Label({ name: 'test label', id: 1, color: '#000000', attributes: [] }),
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            frame: 5,
        });

        let attributes = 'bad attribute';
        expect(() => {
            state.attributes = attributes;
        }).toThrow(cvat.exceptions.ArgumentError);

        attributes = 5;
        expect(() => {
            state.attributes = attributes;
        }).toThrow(cvat.exceptions.ArgumentError);

        attributes = false;
        expect(() => {
            state.attributes = attributes;
        }).toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: set points for an object state', () => {
    test('set a valid value', () => {
        const state = new cvat.classes.ObjectState({
            label: new cvat.classes.Label({ name: 'test label', id: 1, color: '#000000', attributes: [] }),
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            frame: 5,
        });

        const points = [1, 2, 3, 4];
        state.points = points;
        expect(state.points).toEqual(points);
    });

    test('trying to set a bad value', () => {
        const state = new cvat.classes.ObjectState({
            label: new cvat.classes.Label({ name: 'test label', id: 1, color: '#000000', attributes: [] }),
            objectType: cvat.enums.ObjectType.SHAPE,
            shapeType: cvat.enums.ShapeType.RECTANGLE,
            frame: 5,
        });

        let points = 'bad points';
        expect(() => {
            state.points = points;
        }).toThrow(cvat.exceptions.ArgumentError);

        points = 5;
        expect(() => {
            state.points = points;
        }).toThrow(cvat.exceptions.ArgumentError);

        points = false;
        expect(() => {
            state.points = points;
        }).toThrow(cvat.exceptions.ArgumentError);

        points = {};
        expect(() => {
            state.points = points;
        }).toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: save object from its state', () => {
    test('save valid values for a shape', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        let state = annotations[0];
        expect(state.objectType).toBe(cvat.enums.ObjectType.SHAPE);
        expect(state.shapeType).toBe(cvat.enums.ShapeType.RECTANGLE);
        state.points = [0, 0, 100, 100];
        state.occluded = true;
        [, state.label] = task.labels;
        state.lock = true;
        state = await state.save();
        expect(state).toBeInstanceOf(cvat.classes.ObjectState);
        expect(state.label.id).toBe(task.labels[1].id);
        expect(state.lock).toBe(true);
        expect(state.occluded).toBe(true);
        expect(state.points).toEqual([0, 0, 100, 100]);
    });

    test('save valid values for a track', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(10);
        let state = annotations[1];
        expect(state.objectType).toBe(cvat.enums.ObjectType.TRACK);
        expect(state.shapeType).toBe(cvat.enums.ShapeType.RECTANGLE);

        state.occluded = true;
        state.lock = true;
        state.points = [100, 200, 200, 400];
        state.attributes = {
            1: 'sitting',
            3: 'female',
            2: '10',
            4: 'true',
        };

        state = await state.save();
        expect(state).toBeInstanceOf(cvat.classes.ObjectState);
        expect(state.lock).toBe(true);
        expect(state.occluded).toBe(true);
        expect(state.points).toEqual([100, 200, 200, 400]);
        expect(state.attributes[1]).toBe('sitting');
        expect(state.attributes[2]).toBe('10');
        expect(state.attributes[3]).toBe('female');
        expect(state.attributes[4]).toBe('true');

        state.lock = false;
        [state.label] = task.labels;
        state = await state.save();
        expect(state.label.id).toBe(task.labels[0].id);

        state.outside = true;
        state = await state.save();
        expect(state.lock).toBe(false);
        expect(state.outside).toBe(true);

        state.keyframe = false;
        state = await state.save();
        expect(state.keyframe).toBe(false);
    });

    test('save bad values for a shape', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        const state = annotations[0];

        state.occluded = 'false';
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.occluded = false;
        expect(() => state.points = ['100', '50', '100', {}]).toThrow(cvat.exceptions.ArgumentError);

        state.lock = 'true';
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        const oldLabel = state.label;
        state.lock = false;
        state.label = 1;
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.label = oldLabel;
        state.attributes = { 1: {}, 2: false, 3: () => {} };
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('save bad values for a track', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);
        const state = annotations[0];

        state.occluded = 'false';
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.occluded = false;
        expect(() => state.points = ['100', '50', '100', {}]).toThrow(cvat.exceptions.ArgumentError);

        state.lock = 'true';
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        const oldLabel = state.label;
        state.lock = false;
        state.label = 1;
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.label = oldLabel;
        state.outside = 5;
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.outside = false;
        state.keyframe = '10';
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);

        state.keyframe = true;
        state.attributes = { 1: {}, 2: false, 3: () => {} };
        await expect(state.save()).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('trying to change locked shape', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);
        let state = annotations[0];

        state.lock = true;
        state = await state.save();

        const { points } = state;
        state.points = [0, 0, 500, 500];
        state = await state.save();
        expect(state.points).toEqual(points);
    });

    test('trying to set too small area of a shape', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);
        let state = annotations[0];

        const { points } = state;
        state.points = [0, 0, 2, 2]; // area is 4
        state = await state.save();
        expect(state.points).toEqual(points);
    });

    test('trying to set too small area of a track', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotations = await task.annotations.get(0);
        let state = annotations[0];

        const { points } = state;
        state.points = [0, 0, 2, 2]; // area is 4
        state = await state.save();
        expect(state.points).toEqual(points);
    });

    test('trying to set too small length of a shape', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotations = await task.annotations.get(0);
        let state = annotations[8];

        const { points } = state;
        state.points = [0, 0, 2, 2]; // length is 2
        state = await state.save();
        expect(state.points).toEqual(points);
    });
});

describe('Feature: delete object', () => {
    test('delete a shape', async () => {
        const task = (await cvat.tasks.get({ id: 100 }))[0];
        const annotationsBefore = await task.annotations.get(0);
        const { length } = annotationsBefore;
        await annotationsBefore[0].delete(0);
        const annotationsAfter = await task.annotations.get(0);
        expect(annotationsAfter).toHaveLength(length - 1);
    });

    test('delete a track', async () => {
        const task = (await cvat.tasks.get({ id: 101 }))[0];
        const annotationsBefore = await task.annotations.get(0);
        const { length } = annotationsBefore;
        await annotationsBefore[0].delete(0);
        const annotationsAfter = await task.annotations.get(0);
        expect(annotationsAfter).toHaveLength(length - 1);
    });
});

describe('Feature: skeletons', () => {
    test('lock, hide, occluded, outside for skeletons', async () => {
        const job = (await cvat.jobs.get({ jobID: 40 }))[0];
        let [skeleton] = await job.annotations.get(0, false, JSON.parse('[{"and":[{"==":[{"var":"shape"},"skeleton"]}]}]'));
        expect(skeleton.shapeType).toBe('skeleton');
        skeleton.lock = true;
        skeleton.outside = true;
        skeleton.occluded = true;
        skeleton.hidden = true;
        skeleton = await skeleton.save();
        expect(skeleton.lock).toBe(true);
        expect(skeleton.outside).toBe(true);
        expect(skeleton.occluded).toBe(true);
        expect(skeleton.hidden).toBe(true);
        expect(skeleton.elements).toBeInstanceOf(Array);
        expect(skeleton.elements.length).toBe(skeleton.label.structure.sublabels.length);
        for (const element of skeleton.elements) {
            expect(element.lock).toBe(true);
            expect(element.outside).toBe(true);
            expect(element.occluded).toBe(true);
            expect(element.hidden).toBe(true);
        }

        skeleton.elements[0].lock = false;
        skeleton.elements[0].outside = false;
        skeleton.elements[0].occluded = false;
        skeleton.elements[0].hidden = false;
        skeleton.elements[0].save();

        [skeleton] = await job.annotations.get(0, false, JSON.parse('[{"and":[{"==":[{"var":"shape"},"skeleton"]}]}]'));
        expect(skeleton.lock).toBe(false);
        expect(skeleton.outside).toBe(false);
        expect(skeleton.occluded).toBe(false);
        expect(skeleton.hidden).toBe(false);
    });
});