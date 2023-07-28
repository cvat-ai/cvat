// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Platform from 'platform';
import ErrorStackParser from 'error-stack-parser';

export class Exception extends Error {
    private readonly time: string;
    private readonly system: string;
    private readonly client: string;
    private readonly info: string;
    private readonly filename: string;
    private readonly line: number;
    private readonly column: number;

    constructor(message) {
        super(message);
        const time = new Date().toISOString();
        const system = Platform.os.toString();
        const client = `${Platform.name} ${Platform.version}`;
        const info = ErrorStackParser.parse(this)[0];
        const filename = `${info.fileName}`;
        const line = info.lineNumber;
        const column = info.columnNumber;

        // TODO: NOT IMPLEMENTED?
        // const {
        //     jobID, taskID, clientID, projID,
        // } = config;

        Object.defineProperties(
            this,
            Object.freeze({
                system: {
                    /**
                     * @name system
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     */
                    get: () => system,
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
                },
                // jobID: {
                //     get: () => jobID,
                // },
                // taskID: {
                //     get: () => taskID,
                // },
                // projID: {
                //     get: () => projID,
                // },
                // clientID: {
                //     get: () => clientID,
                // },
                filename: {
                    /**
                     * @name filename
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     */
                    get: () => filename,
                },
                line: {
                    /**
                     * @name line
                     * @type {number}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     */
                    get: () => line,
                },
                column: {
                    /**
                     * @name column
                     * @type {number}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     */
                    get: () => column,
                },
            }),
        );
    }

    async save(): Promise<void> {
        const exceptionObject = {
            system: this.system,
            client: this.client,
            time: this.time,
            // job_id: this.jobID,
            // task_id: this.taskID,
            // proj_id: this.projID,
            // client_id: this.clientID,
            message: this.message,
            filename: this.filename,
            line: this.line,
            column: this.column,
            stack: this.stack,
        };

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const serverProxy = require('./server-proxy').default;
            await serverProxy.server.exception(exceptionObject);
        } catch (exception) {
            // add event
        }
    }
}

export class ArgumentError extends Exception {}

export class DataError extends Exception {}

export class ScriptingError extends Exception {}

export class PluginError extends Exception {}

export class ServerError extends Exception {
    constructor(message, code) {
        super(message);

        Object.defineProperties(
            this,
            Object.freeze({
                code: {
                    get: () => code,
                },
            }),
        );
    }
}
