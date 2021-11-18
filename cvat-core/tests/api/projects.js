// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

// Initialize api
window.cvat = require('../../src/api');

const { Project } = require('../../src/project');

describe('Feature: get projects', () => {
    test('get all projects', async () => {
        const result = await window.cvat.projects.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(2);
        for (const el of result) {
            expect(el).toBeInstanceOf(Project);
        }
    });

    test('get project by id', async () => {
        const result = await window.cvat.projects.get({
            id: 2,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Project);
        expect(result[0].id).toBe(2);
        // eslint-disable-next-line no-underscore-dangle
        expect(result[0]._internalData.task_ids).toHaveLength(1);
    });

    test('get a project by an unknown id', async () => {
        const result = await window.cvat.projects.get({
            id: 1,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get a project by an invalid id', async () => {
        expect(
            window.cvat.projects.get({
                id: '1',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get projects by filters', async () => {
        const result = await window.cvat.projects.get({
            status: 'completed',
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Project);
        expect(result[0].id).toBe(2);
        expect(result[0].status).toBe('completed');
    });

    test('get projects by invalid filters', async () => {
        expect(
            window.cvat.projects.get({
                unknown: '5',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: save a project', () => {
    test('save some changed fields in a project', async () => {
        let result = await window.cvat.tasks.get({
            id: 2,
        });

        result[0].bugTracker = 'newBugTracker';
        result[0].name = 'New Project Name';

        result[0].save();

        result = await window.cvat.tasks.get({
            id: 2,
        });

        expect(result[0].bugTracker).toBe('newBugTracker');
        expect(result[0].name).toBe('New Project Name');
    });

    test('save some new labels in a project', async () => {
        let result = await window.cvat.projects.get({
            id: 6,
        });

        const labelsLength = result[0].labels.length;
        const newLabel = new window.cvat.classes.Label({
            name: 'My boss\'s car',
            attributes: [
                {
                    default_value: 'false',
                    input_type: 'checkbox',
                    mutable: true,
                    name: 'parked',
                    values: ['false'],
                },
            ],
        });

        result[0].labels = [...result[0].labels, newLabel];
        result[0].save();

        result = await window.cvat.projects.get({
            id: 6,
        });

        expect(result[0].labels).toHaveLength(labelsLength + 1);
        const appendedLabel = result[0].labels.filter((el) => el.name === 'My boss\'s car');
        expect(appendedLabel).toHaveLength(1);
        expect(appendedLabel[0].attributes).toHaveLength(1);
        expect(appendedLabel[0].attributes[0].name).toBe('parked');
        expect(appendedLabel[0].attributes[0].defaultValue).toBe('false');
        expect(appendedLabel[0].attributes[0].mutable).toBe(true);
        expect(appendedLabel[0].attributes[0].inputType).toBe('checkbox');
    });

    test('save new project without an id', async () => {
        const project = new window.cvat.classes.Project({
            name: 'New Empty Project',
            labels: [
                {
                    name: 'car',
                    attributes: [
                        {
                            default_value: 'false',
                            input_type: 'checkbox',
                            mutable: true,
                            name: 'parked',
                            values: ['false'],
                        },
                    ],
                },
            ],
            bug_tracker: 'bug tracker value',
        });

        const result = await project.save();
        expect(typeof result.id).toBe('number');
    });
});

describe('Feature: delete a project', () => {
    test('delete a project', async () => {
        let result = await window.cvat.projects.get({
            id: 6,
        });

        await result[0].delete();
        result = await window.cvat.projects.get({
            id: 6,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });
});

describe('Feature: delete a label', () => {
    test('delete a label', async () => {
        let result = await window.cvat.projects.get({
            id: 2,
        });

        const labelsLength = result[0].labels.length;
        const deletedLabels = result[0].labels.filter((el) => el.name !== 'bicycle');
        result[0].labels = deletedLabels;
        result[0].save();
        result = await window.cvat.projects.get({
            id: 2,
        });
        expect(result[0].labels).toHaveLength(labelsLength - 1);
    });
});
