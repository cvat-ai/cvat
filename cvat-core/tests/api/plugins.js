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

describe('Feature: dummy feature', () => {
    test('dummy test', async () => {
        // TODO: Write test after design of plugin system
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
