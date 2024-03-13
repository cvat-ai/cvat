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
const { Task } = require('../../src/session');

// Test cases
describe('Feature: get a list of tasks', () => {
    test('get all tasks', async () => {
        const result = await cvat.tasks.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(7);
        for (const el of result) {
            expect(el).toBeInstanceOf(Task);
        }
    });

    test('get a task by an id', async () => {
        const result = await cvat.tasks.get({
            id: 3,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Task);
        expect(result[0].id).toBe(3);
    });

    test('get a task with skeletons by an id', async () => {
        const result = await cvat.tasks.get({
            id: 40,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(Task);
        expect(result[0].id).toBe(40);
        expect(result[0].labels).toBeInstanceOf(Array);

        for (const label of result[0].labels) {
            expect(label).toBeInstanceOf(cvat.classes.Label);
            if (label.type === 'skeleton') {
                expect(label.hasParent).toBe(false);
                expect(label.structure.sublabels).toBeInstanceOf(Array);
                expect(typeof label.structure.svg).toBe('string');
                expect(label.structure.svg.length).not.toBe(0);

                for (const sublabel of label.structure.sublabels) {
                    expect(sublabel).toBeInstanceOf(cvat.classes.Label);
                    expect(sublabel.hasParent).toBe(true);
                }
            }
        }
    });

    test('get a task by an unknown id', async () => {
        const result = await cvat.tasks.get({
            id: 50,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get a task by an invalid id', async () => {
        expect(
            cvat.tasks.get({
                id: '50',
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('get tasks by filters', async () => {
        const result = await cvat.tasks.get({
            filter: '{"and":[{"==":[{"var":"filter"},"interpolation"]}]}',
        });
        expect(result).toBeInstanceOf(Array);
    });

    test('get tasks by invalid query', async () => {
        expect(
            cvat.tasks.get({
                unknown: '5',
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: save a task', () => {
    test('save some changed fields in a task', async () => {
        let result = await cvat.tasks.get({
            id: 2,
        });

        result[0].bugTracker = 'newBugTracker';
        result[0].name = 'New Task Name';
        result[0].save();

        result = await cvat.tasks.get({
            id: 2,
        });

        expect(result[0].bugTracker).toBe('newBugTracker');
        expect(result[0].name).toBe('New Task Name');
    });

    test('save some new labels in a task', async () => {
        let result = await cvat.tasks.get({
            id: 2,
        });

        const labelsLength = result[0].labels.length;
        const newLabel = new cvat.classes.Label({
            name: "Another label",
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
        await result[0].save();

        result = await cvat.tasks.get({
            id: 2,
        });

        expect(result[0].labels).toHaveLength(labelsLength + 1);
        const appendedLabel = result[0].labels.filter((el) => el.name === "Another label");
        expect(appendedLabel).toHaveLength(1);
        expect(appendedLabel[0].attributes).toHaveLength(1);
        expect(appendedLabel[0].attributes[0].name).toBe('parked');
        expect(appendedLabel[0].attributes[0].defaultValue).toBe('false');
        expect(appendedLabel[0].attributes[0].mutable).toBe(true);
        expect(appendedLabel[0].attributes[0].inputType).toBe('checkbox');
    });

    test('save new task without an id', async () => {
        const task = new cvat.classes.Task({
            name: 'New Task',
            labels: [
                {
                    name: "My boss's car",
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
            image_quality: 50,
        });

        const result = await task.save();
        expect(typeof result.id).toBe('number');
    });

    test('save new task in project', async () => {
        const task = new cvat.classes.Task({
            name: 'New Task',
            project_id: 2,
            bug_tracker: 'bug tracker value',
            image_quality: 50,
        });

        const result = await task.save();
        expect(result.projectId).toBe(2);
    });

    test('create a new task with skeletons', async () => {
        const svgSpec = `
            <line x1="65.11705780029297" y1="18.267141342163086" x2="27.49163818359375" y2="39.504600524902344" stroke="black" data-type="edge" data-node-from="3" stroke-width="0.5" data-node-to="5"></line>
            <line x1="21.806020736694336" y1="18.099916458129883" x2="65.11705780029297" y2="18.267141342163086" stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="3"></line>
            <line x1="61.10367965698242" y1="40.00627136230469" x2="21.806020736694336" y2="18.099916458129883" stroke="black" data-type="edge" data-node-from="4" stroke-width="0.5" data-node-to="1"></line>
            <line x1="44.38127136230469" y1="7.397575378417969" x2="61.10367965698242" y2="40.00627136230469" stroke="black" data-type="edge" data-node-from="2" stroke-width="0.5" data-node-to="4">
            </line><line x1="27.49163818359375" y1="39.504600524902344" x2="44.38127136230469" y2="7.397575378417969" stroke="black" data-type="edge" data-node-from="5" stroke-width="0.5" data-node-to="2"></line>
            <circle r="1.5" stroke="black" fill="#b3b3b3" cx="21.806020736694336" cy="18.099916458129883" stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-name="1"></circle>
            <circle r="1.5" stroke="black" fill="#b3b3b3" cx="44.38127136230469" cy="7.397575378417969" stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-name="2"></circle>
            <circle r="1.5" stroke="black" fill="#b3b3b3" cx="65.11705780029297" cy="18.267141342163086" stroke-width="0.1" data-type="element node" data-element-id="3" data-node-id="3" data-label-name="3"></circle>
            <circle r="1.5" stroke="black" fill="#b3b3b3" cx="61.10367965698242" cy="40.00627136230469" stroke-width="0.1" data-type="element node" data-element-id="4" data-node-id="4" data-label-name="4"></circle>
            <circle r="1.5" stroke="black" fill="#b3b3b3" cx="27.49163818359375" cy="39.504600524902344" stroke-width="0.1" data-type="element node" data-element-id="5" data-node-id="5" data-label-name="5"></circle>
        `;

        const task = new cvat.classes.Task({
            name: 'task with skeletons',
            labels: [{
                name: 'star skeleton',
                type: 'skeleton',
                attributes: [],
                svg: svgSpec,
                sublabels: [{
                    name: '1',
                    type: 'points',
                    attributes: []
                }, {
                    name: '2',
                    type: 'points',
                    attributes: []
                }, {
                    name: '3',
                    type: 'points',
                    attributes: []
                }, {
                    name: '4',
                    type: 'points',
                    attributes: []
                }, {
                    name: '5',
                    type: 'points',
                    attributes: []
                }]
            }],
            project_id: null,
        });

        const result = await task.save();
        expect(typeof result.id).toBe('number');
    });
});

describe('Feature: delete a task', () => {
    test('delete a task', async () => {
        let result = await cvat.tasks.get({
            id: 3,
        });

        await result[0].delete();
        result = await cvat.tasks.get({
            id: 3,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });
});

describe('Feature: delete a label', () => {
    test('delete a label', async () => {
        const [task] = await cvat.tasks.get({
            id: 100,
        });

        const labelsLength = task.labels.length;
        const deletedLabels = task.labels.filter((el) => el.name !== 'person');
        task.labels = deletedLabels;
        const updatedTask = await task.save();
        const [newlyRequestTask] = await cvat.tasks.get({
            id: 100,
        });
        expect(updatedTask.labels).toHaveLength(labelsLength - 1);
        expect(newlyRequestTask.labels).toHaveLength(labelsLength - 1);
    });
});
