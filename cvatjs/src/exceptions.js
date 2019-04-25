/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const Platform = require('platform');
    const ErrorStackParser = require('error-stack-parser');
    const serverProxy = require('./server-proxy');

    class Exception extends Error {
        constructor(message, initialObject = {}) {
            super(message);
            const time = new Date().toISOString();
            const system = Platform.os.toString();
            const client = `${Platform.name} ${Platform.version}`;
            const info = ErrorStackParser.parse(this)[0];
            const filename = info.fileName;
            const line = info.lineNumber;
            const column = info.columnNumber;

            const indexes = {
                jobID: undefined,
                taskID: undefined,
                projID: undefined,
                clientID: undefined,
            };

            for (const key of ['clientID', 'taskID', 'projID', 'jobID']) {
                if (Object.prototype.hasOwnProperty.call(initialObject, key)) {
                    indexes[key] = initialObject[key];
                }
            }

            Object.defineProperties(this, {
                system: {
                    get: () => system,
                },
                client: {
                    get: () => client,
                },
                time: {
                    get: () => time,
                },
                jobID: {
                    get: () => indexes.jobID,
                },
                taskID: {
                    get: () => indexes.taskID,
                },
                projID: {
                    get: () => indexes.projID,
                },
                clientID: {
                    get: () => indexes.clientID,
                },
                filename: {
                    get: () => filename,
                },
                line: {
                    get: () => line,
                },
                column: {
                    get: () => column,
                },
            });
        }

        async save() {
            const exceptionObject = {
                system: this.system,
                client: this.client,
                time: this.time,
                job_id: this.jobID,
                task_id: this.taskID,
                proj_id: this.projID,
                client_id: this.clientID,
                message: this.message,
                filename: this.filename,
                line: this.line,
                column: this.column,
                stack: this.stack,
            };

            try {
                await serverProxy.server.exception(exceptionObject);
            } catch (exception) {
                console.log('\nCould not send an exception', exception);
            }
        }
    }

    class PluginException extends Exception {}
    class ServerInteractionException extends Exception {
        constructor(message, initialObject = {}) {
            super(message, initialObject);
            this.code = initialObject.code;
        }
    }

    module.exports = {
        Exception,
        PluginException,
        ServerInteractionException,
    };
})();
