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
        * @extends Error
    */
    class Exception extends Error {
        /**
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
                        * @readonly
                        * @instance
                    */
                    get: () => system,
                },
                client: {
                    /**
                        * @name client
                        * @type {string}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => client,
                },
                time: {
                    /**
                        * @name time
                        * @type {string}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => time,
                },
                jobID: {
                    /**
                        * @name jobID
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => jobID,
                },
                taskID: {
                    /**
                        * @name taskID
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => taskID,
                },
                projID: {
                    /**
                        * @name projID
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => projID,
                },
                clientID: {
                    /**
                        * @name clientID
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => clientID,
                },
                filename: {
                    /**
                        * @name filename
                        * @type {string}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => filename,
                },
                line: {
                    /**
                        * @name line
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => line,
                },
                column: {
                    /**
                        * @name column
                        * @type {integer}
                        * @memberof Exception
                        * @readonly
                        * @instance
                    */
                    get: () => column,
                },
            });
        }

        /**
            * Save an exception on a server
            * @name save
            * @method
            * @memberof Exception
            * @instance
        */
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
        * Exceptions are referred with arguments data
        * @extends Exception
    */
    class ArgumentError extends Exception {
        /**
            * @param {string} message - Exception message
        */
        constructor(message) {
            super(message);
        }
    }

    /**
        * Unexpected situations in code
        * @extends Exception
        */
    class ScriptingError extends Exception {
        /**
            * @param {string} message - Exception message
        */
        constructor(message) {
            super(message);
        }
    }

    /**
        * Plugin-referred exceptions
        * @extends Exception
    */
    class PluginError extends Exception {
        /**
            * @param {string} message - Exception message
        */
        constructor(message) {
            super(message);
        }
    }

    /**
        * Exceptions in interaction with a server
        * @extends Exception
    */
    class ServerError extends Exception {
        /**
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
                    * @readonly
                    * @instance
                */
                get: () => code,
            });
        }
    }

    module.exports = {
        Exception,
        ArgumentError,
        ScriptingError,
        PluginError,
        ServerError,
    };
})();
