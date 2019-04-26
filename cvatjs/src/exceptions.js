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
    const hidden = require('./hidden');

    /**
        * Base exception class
    */
    class Exception extends Error {
        /**
            * Create an exception
            * @param {string} message - Exception message
        */
        constructor(message) {
            super(message);
            const time = new Date().toISOString();
            const system = Platform.os.toString();
            const client = `${Platform.name} ${Platform.version}`;
            const info = ErrorStackParser.parse(this)[0];
            const filename = `${hidden.location}${info.fileName}`;
            const line = info.lineNumber;
            const column = info.columnNumber;
            const {
                jobID,
                taskID,
                clientID,
            } = hidden;

            const projID = undefined; // wasn't implemented

            Object.defineProperties(this, {
                system: {
                    /**
                        * @name system
                        * @type {string}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => system,
                },
                client: {
                    /**
                        * @name client
                        * @type {string}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => client,
                },
                time: {
                    /**
                        * @name time
                        * @type {string}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => time,
                },
                jobID: {
                    /**
                        * @name jobID
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => jobID,
                },
                taskID: {
                    /**
                        * @name taskID
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => taskID,
                },
                projID: {
                    /**
                        * @name projID
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => projID,
                },
                clientID: {
                    /**
                        * @name clientID
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => clientID,
                },
                filename: {
                    /**
                        * @name filename
                        * @type {string}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => filename,
                },
                line: {
                    /**
                        * @name line
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
                    get: () => line,
                },
                column: {
                    /**
                        * @name column
                        * @type {integer}
                        * @memberof Exception
                        * @instance
                    */
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
                const serverProxy = require('./server-proxy');
                await serverProxy.server.exception(exceptionObject);
            } catch (exception) {
                // add event
            }
        }
    }

    /**
        * Plugin-referred exceptions
        * @extends Exception
    */
    class PluginException extends Exception {}

    /**
        * Exceptions in interaction with a server
        * @extends Exception
    */
    class ServerInteractionException extends Exception {
        /**
            * Create an exception
            * @param {string} message - Exception message
            * @param {string|integer} code - Response code
        */
        constructor(message, code) {
            super(message);

            Object.defineProperty(this, 'code', {
                /**
                    * @name code
                    * @type {string|integer}
                    * @memberof ServerInteractionException
                    * @instance
                */
                get: () => code,
            });
        }
    }

    module.exports = {
        Exception,
        PluginException,
        ServerInteractionException,
    };
})();
