// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { detect } from 'detect-browser';
import PluginRegistry from './plugins';
import { LogType } from './enums';
import { ArgumentError } from './exceptions';

export class EventLogger {
    public readonly id: number;
    public readonly scope: LogType;
    public readonly time: Date;

    public payload: any;

    protected onCloseCallback: (() => void) | null;

    constructor(logType: LogType, payload: any) {
        this.onCloseCallback = null;

        this.scope = logType;
        this.payload = { ...payload };
        this.time = new Date();
    }

    public onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    public validatePayload(): void {
        if (typeof this.payload !== 'object') {
            throw new ArgumentError('Payload must be an object');
        }

        try {
            JSON.stringify(this.payload);
        } catch (error) {
            const message = `Log payload must be JSON serializable. ${error.toString()}`;
            throw new ArgumentError(message);
        }
    }

    public dump(): any {
        const payload = { ...this.payload };
        const body = {
            scope: this.scope,
            timestamp: this.time.toISOString(),
        };

        for (const field of [
            'obj_name',
            'obj_id',
            'obj_val',
            'count',
            'duration',
            'project_id',
            'task_id',
            'job_id',
            'user_id',
            'organization',
        ]) {
            if (field in payload) {
                body[field] = payload[field];
                delete payload[field];
            }
        }

        return {
            ...body,
            payload: JSON.stringify(payload),
        };
    }

    // Method saves a durable log in a storage
    // Note then you can call close() multiple times
    // Log duration will be computed based on the latest call
    // All payloads will be shallowly combined (all top level properties will exist)
    public async close(payload = {}): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, EventLogger.prototype.close, payload);
        return result;
    }
}

Object.defineProperties(EventLogger.prototype.close, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(payload: any) {
            this.payload.duration = Date.now() - this.time.getTime();
            this.payload = { ...this.payload, ...payload };
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        },
    },
});

class LogWithCount extends EventLogger {
    public validatePayload(): void {
        super.validatePayload.call(this);
        if (!Number.isInteger(this.payload.count) || this.payload.count < 1) {
            const message = `The field "count" is required for "${this.scope}" log. It must be a positive integer`;
            throw new ArgumentError(message);
        }
    }
}

class LogWithExceptionInfo extends EventLogger {
    public validatePayload(): void {
        super.validatePayload.call(this);

        if (typeof this.payload.message !== 'string') {
            const message = `The field "message" is required for ${this.scope} log. It must be a string`;
            throw new ArgumentError(message);
        }

        if (typeof this.payload.filename !== 'string') {
            const message = `The field "filename" is required for ${this.scope} log. It must be a string`;
            throw new ArgumentError(message);
        }

        if (typeof this.payload.line !== 'number') {
            const message = `The field "line" is required for ${this.scope} log. It must be a number`;
            throw new ArgumentError(message);
        }

        if (typeof this.payload.column !== 'number') {
            const message = `The field "column" is required for ${this.scope} log. It must be a number`;
            throw new ArgumentError(message);
        }

        if (typeof this.payload.stack !== 'string') {
            const message = `The field "stack" is required for ${this.scope} log. It must be a string`;
            throw new ArgumentError(message);
        }
    }

    public dump(): any {
        const body = super.dump();
        const client = detect();
        body.payload = JSON.stringify({
            ...JSON.parse(body.payload),
            system: client.os,
            client: client.name,
            version: client.version,
        });

        return body;
    }
}

class LogWithControlsInfo extends EventLogger {
    public dump(): any {
        this.payload = {
            obj_val: this.payload?.text,
            obj_name: this.payload?.classes,
        };
        return super.dump();
    }
}

export default function logFactory(logType: LogType, payload: any): EventLogger {
    const logsWithCount = [
        LogType.deleteObject,
        LogType.mergeObjects,
        LogType.copyObject,
        LogType.undoAction,
        LogType.redoAction,
    ];

    if (logsWithCount.includes(logType)) {
        return new LogWithCount(logType, payload);
    }

    if (logType === LogType.exception) {
        return new LogWithExceptionInfo(logType, payload);
    }

    if (logType === LogType.clickElement) {
        return new LogWithControlsInfo(logType, payload);
    }

    return new EventLogger(logType, payload);
}
