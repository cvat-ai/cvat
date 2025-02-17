// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import makeEvent, { Event, JSONEventPayload } from './event';
import { EventScope } from './enums';
import { ArgumentError } from './exceptions';

function sleep(ms): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function defaultUpdate(previousEvent: Event, currentPayload: JSONEventPayload): JSONEventPayload {
    const count = Number.isInteger(previousEvent.payload.count) ? previousEvent.payload.count as number : 1;

    return {
        ...previousEvent.payload,
        ...currentPayload,
        count: count + 1,
        duration: Date.now() - previousEvent.timestamp.getTime(),
    };
}

interface IgnoreRule {
    lastEvent: Event | null;
    timeThreshold?: number;
    ignore: (previousEvent: Event, currentPayload: JSONEventPayload) => boolean;
    update: (previousEvent: Event, currentPayload: JSONEventPayload) => JSONEventPayload;
}

class Logger {
    public clientID: string;
    public collection: Array<Event>;
    public lastSentEvent: Event | null;
    public ignoreRules: Record<string, IgnoreRule>;
    public isActiveChecker: () => boolean;
    public saving: boolean;
    public compressedScopes: Array<EventScope>;

    constructor() {
        this.clientID = Date.now().toString().substr(-6);
        this.collection = [];
        this.lastSentEvent = null;
        this.isActiveChecker = () => true;
        this.saving = false;
        this.compressedScopes = [EventScope.changeFrame];
        this.ignoreRules = {
            [EventScope.zoomImage]: {
                lastEvent: null,
                ignore: (previousEvent: Event): boolean => {
                    // previous event from the same scope is the latest push event in the collection
                    // it means, no more events were pushed between the previous and this one
                    const [lastCollectionEvent] = this.collection.slice(-1);
                    return previousEvent === lastCollectionEvent;
                },
                update: defaultUpdate,
            },
            [EventScope.exception]: {
                lastEvent: null,
                ignore: (previousEvent: Event, currentPayload: JSONEventPayload): boolean => {
                    const { stack, message } = currentPayload;
                    const [lastCollectionEvent] = this.collection.slice(-1);
                    return lastCollectionEvent === previousEvent &&
                        stack === previousEvent.payload.stack &&
                        message === previousEvent.payload.message;
                },
                update(previousEvent: Event): JSONEventPayload {
                    const count = Number.isInteger(previousEvent.payload.count) ?
                        previousEvent.payload.count as number : 1;
                    return {
                        ...previousEvent.payload,
                        count: count + 1,
                        lastTimestamp: new Date().toISOString(),
                    };
                },
            },
            [EventScope.changeFrame]: {
                lastEvent: null,
                ignore(previousEvent: Event, currentPayload: JSONEventPayload): boolean {
                    return (
                        currentPayload.job_id === previousEvent.payload.job_id &&
                        currentPayload.step === previousEvent.payload.step
                    );
                },
                update(previousEvent: Event, currentPayload: JSONEventPayload): JSONEventPayload {
                    return {
                        ...previousEvent.payload,
                        to: currentPayload.to,
                        count: (previousEvent.payload.count as number) + 1,
                    };
                },
            },
        };
    }

    public async configure(isActiveChecker: () => boolean): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Logger.prototype.configure,
            isActiveChecker,
        );
        return result;
    }

    public async log(scope: EventScope, payload = {}, wait = false): Promise<Event> {
        const result = await PluginRegistry.apiWrapper.call(this, Logger.prototype.log, scope, payload, wait);
        return result;
    }

    public async save(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Logger.prototype.save);
        return result;
    }
}

Object.defineProperties(Logger.prototype.configure, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            this: Logger, isActiveChecker: () => boolean,
        ) {
            if (typeof isActiveChecker !== 'function') {
                throw new ArgumentError('isActiveChecker argument must be callable');
            }

            this.isActiveChecker = isActiveChecker;
        },
    },
});

Object.defineProperties(Logger.prototype.log, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            this: Logger,
            scope: EventScope,
            payload: JSONEventPayload,
            wait: boolean,
        ) {
            if (typeof payload !== 'object') {
                throw new ArgumentError('Payload must be an object');
            }

            if (typeof wait !== 'boolean') {
                throw new ArgumentError('Wait must be boolean');
            }

            if (!(this.compressedScopes as string[]).includes(scope)) {
                this.compressedScopes.forEach((compressedScope) => {
                    this.ignoreRules[compressedScope].lastEvent = null;
                });
            }

            if (scope in this.ignoreRules) {
                const ignoreRule = this.ignoreRules[scope];
                const { lastEvent } = ignoreRule;
                if (lastEvent && ignoreRule.ignore(lastEvent, payload)) {
                    lastEvent.payload = ignoreRule.update(lastEvent, payload);

                    return ignoreRule.lastEvent;
                }
            }

            const eventPayload = { ...payload };
            eventPayload.client_id = this.clientID;
            eventPayload.is_active = this.isActiveChecker();

            const event = makeEvent(scope, { ...eventPayload });

            const pushEvent = (): void => {
                event.validatePayload();
                event.onClose(null);
                this.collection.push(event);

                if (scope in this.ignoreRules) {
                    this.ignoreRules[scope].lastEvent = event;
                }
            };

            if (wait) {
                event.onClose(pushEvent);
            } else {
                pushEvent();
            }

            return event;
        },
    },
});

Object.defineProperties(Logger.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(this: Logger) {
            if (!this.collection.length) {
                return;
            }

            while (this.saving) {
                await sleep(1000);
            }

            const collectionToSend = [...this.collection];
            try {
                this.saving = true;
                this.collection = [];
                await serverProxy.events.save({
                    events: collectionToSend.map((event) => event.dump()),
                    previous_event: this.lastSentEvent?.dump(),
                    timestamp: new Date().toISOString(),
                });

                this.lastSentEvent = collectionToSend[collectionToSend.length - 1];

                for (const rule of Object.values<IgnoreRule>(this.ignoreRules)) {
                    rule.lastEvent = null;
                }
            } catch (error: unknown) {
                // if failed, put collection back
                // potentially new events may be generated during saving
                // that is why we add this.collection
                this.collection = [...collectionToSend, ...this.collection];

                throw error;
            } finally {
                this.saving = false;
            }
        },
    },
});

export default new Logger();
