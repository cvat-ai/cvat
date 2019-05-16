/*
 * Copyright (C) 2018 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* eslint import/no-extraneous-dependencies: 0 */

/* global
    require:false
*/

const { tasks } = require('./dummy-data.mock');

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

class ServerProxy {
    constructor() {
        async function about() {
            return null;
        }

        async function share(directory) {
            return null;
        }

        async function exception(exceptionObject) {
            return null;
        }

        async function login(username, password) {
            return null;
        }

        async function getTasks(filter = '') {
            const queries = QueryStringToJSON(filter);
            const result = tasks.results.filter((x) => {
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
            return tasks.results.reduce((acc, task) => {
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
            return null;
        }

        async function getSelf() {
            return null;
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
