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
describe('Feature: get a list of tasks', () => {
    test('get all tasks', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });

    test('get a task by an id', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });

    test('get a task by an unknown id', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });

    test('get a task by an invalid id', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });

    test('get tasks by filters', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });

    test('get tasks by invalid filters', async () => {
        const result = await window.cvat.tasks.get();
        expect(result).toEqual([]);
    });
});


/*
const plugin = {
    name: 'Example Plugin',
    description: 'This example plugin demonstrates how plugin system in CVAT works',
    cvat: {
        server: {
            about: {
                async leave(self, result) {
                    result.plugins = await self.internal.getPlugins();
                    return result;
                },
            },
        },
        classes: {
            Job: {
                prototype: {
                    annotations: {
                        put: {
                            enter(self, objects) {
                                for (const obj of objects) {
                                    if (obj.type !== 'tag') {
                                        const points = obj.position.map((point) => {
                                            const roundPoint = {
                                                x: Math.round(point.x),
                                                y: Math.round(point.y),
                                            };
                                            return roundPoint;
                                        });
                                        obj.points = points;
                                    }
                                }
                            },
                        },
                    },
                },
            },
        },
    },
    internal: {
        async getPlugins() {
            const plugins = await window.cvat.plugins.list();
            return plugins.map((el) => {
                const obj = {
                    name: el.name,
                    description: el.description,
                };
                return obj;
            });
        },
    },
};


async function test() {
    await window.cvat.plugins.register(plugin);
    await window.cvat.server.login('admin', 'nimda760');

    try {
        console.log(JSON.stringify(await window.cvat.server.about()));
        console.log(await window.cvat.users.get({ self: false }));
        console.log(await window.cvat.users.get({ self: true }));
        console.log(JSON.stringify(await window.cvat.jobs.get({ taskID: 8 })));
        console.log(JSON.stringify(await window.cvat.jobs.get({ jobID: 10 })));
        console.log(await window.cvat.tasks.get());
        console.log(await window.cvat.tasks.get({ id: 8 }));
        console.log('Done.');
    } catch (exception) {
        console.log(exception.constructor.name);
        console.log(exception.message);
    }
}
*/
