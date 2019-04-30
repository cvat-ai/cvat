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
        * @memberof module:API.cvat.exceptions
        * @extends Error
        * @ignore
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
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => system,
                    writable: false,
                },
                client: {
                    /**
                        * @name client
                        * @type {string}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => client,
                    writable: false,
                },
                time: {
                    /**
                        * @name time
                        * @type {string}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => time,
                    writable: false,
                },
                jobID: {
                    /**
                        * @name jobID
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => jobID,
                    writable: false,
                },
                taskID: {
                    /**
                        * @name taskID
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => taskID,
                    writable: false,
                },
                projID: {
                    /**
                        * @name projID
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => projID,
                    writable: false,
                },
                clientID: {
                    /**
                        * @name clientID
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => clientID,
                    writable: false,
                },
                filename: {
                    /**
                        * @name filename
                        * @type {string}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => filename,
                    writable: false,
                },
                line: {
                    /**
                        * @name line
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => line,
                    writable: false,
                },
                column: {
                    /**
                        * @name column
                        * @type {integer}
                        * @memberof module:API.cvat.exceptions.Exception
                        * @readonly
                        * @instance
                    */
                    get: () => column,
                    writable: false,
                },
            });
        }

        /**
            * Save an exception on a server
            * @name save
            * @method
            * @memberof Exception
            * @instance
            * @async
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
        * @memberof module:API.cvat.exceptions
        * @extends module:API.cvat.exceptions.Exception
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
        * @memberof module:API.cvat.exceptions
        * @extends module:API.cvat.exceptions.Exception
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
        * @memberof module:API.cvat.exceptions
        * @extends module:API.cvat.exceptions.Exception
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
        * @memberof module:API.cvat.exceptions
        * @extends module:API.cvat.exceptions.Exception
    */
    class ServerError extends Exception {
        /**
            * @param {string} message - Exception message
            * @param {(string|integer)} code - Response code
        */
        constructor(message, code) {
            super(message);

            Object.defineProperty(this, 'code', {
                /**
                    * @name code
                    * @type {(string|integer)}
                    * @memberof module:API.cvat.exceptions.ServerError
                    * @readonly
                    * @instance
                */
                get: () => code,
                writable: false,
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
