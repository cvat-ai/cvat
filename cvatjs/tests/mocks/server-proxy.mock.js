/*
 * Copyright (C) 2018 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* eslint import/no-extraneous-dependencies: 0 */

/* global
    require:false
*/

const {
    tasksDummyData,
    aboutDummyData,
    shareDummyData,
    usersDummyData,
} = require('./dummy-data.mock');


class ServerProxy {
    constructor() {
        async function about() {
            return JSON.parse(JSON.stringify(aboutDummyData));
        }

        async function share(directory) {
            let position = shareDummyData;

            // Emulation of internal directories
            if (directory.length > 1) {
                const components = directory.split('/');

                for (const component of components) {
                    const idx = position.map(x => x.name).indexOf(component);
                    if (idx !== -1 && 'children' in position[idx]) {
                        position = position[idx].children;
                    } else {
                        throw new window.cvat.exceptions.ServerError(
                            `${component} is not a valid directory`,
                            400,
                        );
                    }
                }
            }

            return JSON.parse(JSON.stringify(position));
        }

        async function exception(exceptionObject) {
            return null;
        }

        async function login() {
            return null;
        }

        async function getTasks(filter = '') {
            function QueryStringToJSON(query) {
                const pairs = [...new URLSearchParams(query).entries()];

                const result = {};
                for (const pair of pairs) {
                    const [key, value] = pair;
                    if (['id'].includes(key)) {
                        result[key] = +value;
                    } else {
                        result[key] = value;
                    }
                }

                return JSON.parse(JSON.stringify(result));
            }

            // Emulation of a query filter
            const queries = QueryStringToJSON(filter);
            const result = tasksDummyData.results.filter((x) => {
                for (const key in queries) {
                    if (Object.prototype.hasOwnProperty.call(queries, key)) {
                        // TODO: Particular match for some fields is not checked
                        if (queries[key] !== x[key]) {
                            return false;
                        }
                    }
                }

                return true;
            });

            return result;
        }

        async function getJob(jobID) {
            return tasksDummyData.results.reduce((acc, task) => {
                for (const segment of task.segments) {
                    for (const job of segment.jobs) {
                        const copy = JSON.parse(JSON.stringify(job));
                        copy.start_frame = segment.start_frame;
                        copy.stop_frame = segment.stop_frame;
                        copy.task_id = task.id;

                        acc.push(copy);
                    }
                }

                return acc;
            }, []).filter(job => job.id === jobID);
        }

        async function getUsers() {
            return JSON.parse(JSON.stringify(usersDummyData)).results;
        }

        async function getSelf() {
            return JSON.parse(JSON.stringify(usersDummyData)).results[0];
        }

        async function getFrame(tid, frame) {
            return null;
        }

        async function getMeta(tid) {
            return null;
        }

        Object.defineProperties(this, Object.freeze({
            server: {
                value: Object.freeze({
                    about,
                    share,
                    exception,
                    login,
                }),
                writable: false,
            },

            tasks: {
                value: Object.freeze({
                    getTasks,
                }),
                writable: false,
            },

            jobs: {
                value: Object.freeze({
                    getJob,
                }),
                writable: false,
            },

            users: {
                value: Object.freeze({
                    getUsers,
                    getSelf,
                }),
                writable: false,
            },

            frames: {
                value: Object.freeze({
                    getFrame,
                    getMeta,
                }),
                writable: false,
            },
        }));
    }
}

const serverProxy = new ServerProxy();
module.exports = serverProxy;
