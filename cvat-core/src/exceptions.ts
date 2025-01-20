// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
}

export class ArgumentError extends Exception {}

export class DataError extends Exception {}

export class ScriptingError extends Exception {}

export class RequestError extends Exception {}

export class ServerError extends Exception {
    public code: number;
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
