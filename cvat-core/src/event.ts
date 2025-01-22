// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { detect } from 'detect-browser';
import PluginRegistry from './plugins';
import { EventScope } from './enums';
import { ArgumentError } from './exceptions';

export interface SerializedEvent {
    scope: EventScope;
    timestamp: string;
    obj_name?: string;
    obj_id?: number;
    obj_val?: string;
    count?: number;
    duration?: number;
    project_id?: number;
    task_id?: number;
    job_id?: number;
    user_id?: number;
    organization?: number;
    payload: string;
}

export type JSONEventPayload = { [key: string]: number | string | boolean };

export class Event {
    public readonly scope: EventScope;
    public readonly timestamp: Date;
    public payload: JSONEventPayload;

    protected onCloseCallback: (() => void) | null;

    constructor(scope: EventScope, payload: JSONEventPayload) {
        this.onCloseCallback = null;
        this.scope = scope;
        this.payload = { ...payload };
        this.timestamp = new Date();
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

    public dump(): SerializedEvent {
        const payload = { ...this.payload };
        const body = {
            scope: this.scope,
            timestamp: this.timestamp.toISOString(),
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
                if (typeof payload[field] !== 'string' || payload[field]) {
                    // avoid empty strings to be sent
                    body[field] = payload[field];
                }
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
        const result = await PluginRegistry.apiWrapper.call(this, Event.prototype.close, payload);
        return result;
    }
}

Object.defineProperties(Event.prototype.close, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(this: Event, payload: JSONEventPayload) {
            this.payload.duration = Date.now() - this.timestamp.getTime();
            this.payload = { ...this.payload, ...payload };
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        },
    },
});

class EventWithCount extends Event {
    public validatePayload(): void {
        super.validatePayload.call(this);
        if (!Number.isInteger(this.payload.count) || (this.payload.count as number) < 1) {
            const message = `The field "count" is required for "${this.scope}" log. It must be a positive integer`;
            throw new ArgumentError(message);
        }
    }
}

class EventWithExceptionInfo extends Event {
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

export default function makeEvent(scope: EventScope, payload: JSONEventPayload): Event {
    const eventsWithCount = [
        EventScope.deleteObject,
        EventScope.mergeObjects,
        EventScope.copyObject,
        EventScope.undoAction,
        EventScope.redoAction,
        EventScope.changeFrame,
    ];

    if (eventsWithCount.includes(scope)) {
        return new EventWithCount(scope, payload);
    }

    if (scope === EventScope.exception) {
        return new EventWithExceptionInfo(scope, payload);
    }

    return new Event(scope, payload);
}
