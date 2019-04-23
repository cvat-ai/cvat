/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


// Authentification exception
// Network communication exception
// Server Error


(() => {
    const serverProxy = require('./server-proxy');

    class Exception extends Error {
        constructor(...args) {
            super(...args);
            this.system = undefined;
            this.client = undefined;
            this.time = undefined;
            this.jobID = undefined;
            this.taskID = undefined;
            this.projID = undefined;
            this.clientID = undefined;
            this.message = undefined;
            this.filename = undefined;
            this.line = undefined;
            this.column = undefined;
            this.stack = undefined;
            this.code = undefined;
        }

        get system() {
            return this.system;
        }

        get client() {
            return this.client;
        }

        get time() {
            return this.time;
        }

        get jobID() {
            return this.jobID;
        }

        get taskID() {
            return this.taskID;
        }

        get projID() {
            return this.clientID;
        }

        get message() {
            return this.message;
        }

        get filename() {
            return this.filename;
        }

        get line() {
            return this.line;
        }

        get column() {
            return this.column;
        }

        get stack() {
            return this.stack;
        }

        get code() {
            return this.code;
        }

        async save() {

            this.code = null;
        }
    }

    module.exports = {
        Exception,

    };
})();
