/*
 * Copyright (C) 2018 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* eslint import/no-extraneous-dependencies: 0 */

/* global
    require:false
*/

const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('../data/db.sqlite3');

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
            const d = db;
            return [];
        }

        async function getJob(jobID) {
            return null;
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
