// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    require:false
*/

const { detect } = require('detect-browser');
const PluginRegistry = require('./plugins');
const { ArgumentError } = require('./exceptions');
const { LogType } = require('./enums');

/**
    * Class representing a single log
    * @memberof module:API.cvat.classes
    * @hideconstructor
*/
class Log {
    constructor(logType, payload) {
        this.onCloseCallback = null;

        this.type = logType;
        this.payload = { ...payload };
        this.time = new Date();
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    validatePayload() {
        if (typeof (this.payload) !== 'object') {
            throw new ArgumentError('Payload must be an object');
        }

        try {
            JSON.stringify(this.payload);
        } catch (error) {
            const message = `Log payload must be JSON serializable. ${error.toString()}`;
            throw new ArgumentError(message);
        }
    }

    dump() {
        const payload = { ...this.payload };
        const body = {
            name: this.type,
            time: this.time.toISOString(),
        };

        for (const field of ['client_id', 'job_id', 'task_id', 'is_active']) {
            if (field in payload) {
                body[field] = payload[field];
                delete payload[field];
            }
        }

        return {
            ...body,
            payload,
        };
    }

    /**
        * Method saves a durable log in a storage <br>
        * Note then you can call close() multiple times <br>
        * Log duration will be computed based on the latest call <br>
        * All payloads will be shallowly combined (all top level properties will exist)
        * @method close
        * @memberof module:API.cvat.classes.Log
        * @param {object} [payload] part of payload can be added when close a log
        * @readonly
        * @instance
        * @async
        * @throws {module:API.cvat.exceptions.PluginError}
        * @throws {module:API.cvat.exceptions.ArgumentError}
    */
    async close(payload = {}) {
        const result = await PluginRegistry
            .apiWrapper.call(this, Log.prototype.close, payload);
        return result;
    }
}

Log.prototype.close.implementation = function (payload) {
    this.payload.duration = Date.now() - this.time.getTime();
    this.payload = { ...this.payload, ...payload };

    if (this.onCloseCallback) {
        this.onCloseCallback();
    }
};

class LogWithCount extends Log {
    validatePayload() {
        Log.prototype.validatePayload.call(this);
        if (!Number.isInteger(this.payload.count) || this.payload.count < 1) {
            const message = `The field "count" is required for "${this.type}" log`
                + 'It must be a positive integer';
            throw new ArgumentError(message);
        }
    }
}

class LogWithObjectsInfo extends Log {
    validatePayload() {
        const generateError = (name, range) => {
            const message = `The field "${name}" is required for "${this.type}" log. ${range}`;
            throw new ArgumentError(message);
        };

        if (!Number.isInteger(this.payload['track count']) || this.payload['track count'] < 0) {
            generateError('track count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['tag count']) || this.payload['tag count'] < 0) {
            generateError('tag count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['object count']) || this.payload['object count'] < 0) {
            generateError('object count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['frame count']) || this.payload['frame count'] < 1) {
            generateError('frame count', 'It must be an integer not less than 1');
        }

        if (!Number.isInteger(this.payload['box count']) || this.payload['box count'] < 0) {
            generateError('box count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['polygon count']) || this.payload['polygon count'] < 0) {
            generateError('polygon count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['polyline count']) || this.payload['polyline count'] < 0) {
            generateError('polyline count', 'It must be an integer not less than 0');
        }

        if (!Number.isInteger(this.payload['points count']) || this.payload['points count'] < 0) {
            generateError('points count', 'It must be an integer not less than 0');
        }
    }
}

class LogWithWorkingTime extends Log {
    validatePayload() {
        Log.prototype.validatePayload.call(this);

        if (!('working_time' in this.payload)
            || !typeof (this.payload.working_time) === 'number'
            || this.payload.working_time < 0
        ) {
            const message = `The field "working_time" is required for ${this.type} log. `
                + 'It must be a number not less than 0';
            throw new ArgumentError(message);
        }
    }
}

class LogWithExceptionInfo extends Log {
    validatePayload() {
        Log.prototype.validatePayload.call(this);

        if (typeof (this.payload.message) !== 'string') {
            const message = `The field "message" is required for ${this.type} log. `
                + 'It must be a string';
            throw new ArgumentError(message);
        }

        if (typeof (this.payload.filename) !== 'string') {
            const message = `The field "filename" is required for ${this.type} log. `
                + 'It must be a string';
            throw new ArgumentError(message);
        }

        if (typeof (this.payload.line) !== 'number') {
            const message = `The field "line" is required for ${this.type} log. `
                + 'It must be a number';
            throw new ArgumentError(message);
        }

        if (typeof (this.payload.column) !== 'number') {
            const message = `The field "column" is required for ${this.type} log. `
                + 'It must be a number';
            throw new ArgumentError(message);
        }

        if (typeof (this.payload.stack) !== 'string') {
            const message = `The field "stack" is required for ${this.type} log. `
                + 'It must be a string';
            throw new ArgumentError(message);
        }
    }

    dump() {
        const payload = { ...this.payload };
        const client = detect();
        const body = {
            client_id: payload.client_id,
            name: this.type,
            time: this.time.toISOString(),
            message: payload.message,
            filename: payload.filename,
            line: payload.line,
            column: payload.column,
            stack: payload.stack,
            system: client.os,
            client: client.name,
            version: client.version,
        };

        delete payload.client_id;
        delete payload.message;
        delete payload.filename;
        delete payload.line;
        delete payload.column;
        delete payload.stack;

        return {
            ...body,
            payload,
        };
    }
}

function logFactory(logType, payload) {
    const logsWithCount = [
        LogType.deleteObject, LogType.mergeObjects, LogType.copyObject,
        LogType.undoAction, LogType.redoAction,
    ];

    if (logsWithCount.includes(logType)) {
        return new LogWithCount(logType, payload);
    }
    if ([LogType.sendTaskInfo, LogType.loadJob, LogType.uploadAnnotations].includes(logType)) {
        return new LogWithObjectsInfo(logType, payload);
    }

    if (logType === LogType.sendUserActivity) {
        return new LogWithWorkingTime(logType, payload);
    }

    if (logType === LogType.sendException) {
        return new LogWithExceptionInfo(logType, payload);
    }

    return new Log(logType, payload);
}

module.exports = logFactory;
