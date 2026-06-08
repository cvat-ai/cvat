// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from '../plugins';
import { ArgumentError } from '../exceptions';
import { Label } from '../labels';
import { ObjectType, Source } from '../enums';
import type { SerializedInterval } from '../server-response-types';
import type { AudioIntervalUpdateFlags } from './types';

export interface SerializedAudioIntervalState {
    objectType: ObjectType.INTERVAL;
    label: Label;
    clientID: number | null;
    serverID: number | null;
    start: number;
    stop: number | null;
    color: string;
    lock: boolean;
    updated: number;
    source: Source;
    score: number;
    votes: number;
    hidden: boolean;
    attributes: Record<number, string>;
    __internal?: {
        save: (audioIntervalState: AudioIntervalState) => AudioIntervalState;
        delete: (frame: number | null, force: boolean) => boolean;
        export: () => SerializedInterval;
    };
}

export class AudioIntervalState {
    private readonly __internal: SerializedAudioIntervalState['__internal'];

    public readonly updateFlags: AudioIntervalUpdateFlags;
    public readonly objectType: ObjectType.INTERVAL;
    public readonly source: Source;
    public readonly clientID: number | null;
    public readonly serverID: number | null;
    public readonly updated: number;
    public readonly score: number;
    public readonly votes: number;
    public label: Label;
    public start: number;
    public stop: number | null;
    public color: string;
    public hidden: boolean;
    public lock: boolean;
    public attributes: Record<number, string>;

    constructor(serialized: SerializedAudioIntervalState) {
        if (serialized.objectType !== ObjectType.INTERVAL) {
            throw new ArgumentError(
                `AudioIntervalState must be provided correct ObjectType (INTERVAL), got ${serialized.objectType}`,
            );
        }

        if (!(serialized.label instanceof Label)) {
            throw new ArgumentError(
                `AudioIntervalState must be provided correct Label, got wrong value ${serialized.label}`,
            );
        }

        if (typeof serialized.start !== 'number') {
            throw new ArgumentError(
                `AudioIntervalState must be provided correct start, got wrong value ${serialized.start}`,
            );
        }

        if (serialized.stop !== null && typeof serialized.stop !== 'number') {
            throw new ArgumentError(
                `AudioIntervalState must be provided correct stop, got wrong value ${serialized.stop}`,
            );
        }

        const updateFlags: AudioIntervalUpdateFlags = {
            reset() {
                delete this.label;
                delete this.attributes;
                delete this.position;
                delete this.lock;
                delete this.color;
                delete this.hidden;
            },
        };

        Object.defineProperty(updateFlags, 'reset', {
            enumerable: false,
            writable: false,
        });

        const data = {
            label: serialized.label,
            attributes: {},
            start: serialized.start,
            stop: serialized.stop,
            lock: serialized.lock,
            color: serialized.color,
            hidden: serialized.hidden,
            source: serialized.source,
            updated: serialized.updated,
            clientID: serialized.clientID,
            serverID: serialized.serverID,
            objectType: serialized.objectType,
            updateFlags,
            score: serialized.score,
            votes: serialized.votes,
        };

        Object.defineProperties(
            this,
            Object.freeze({
                updateFlags: {
                    get: () => data.updateFlags,
                },
                objectType: {
                    get: () => data.objectType,
                },
                source: {
                    get: () => data.source,
                },
                score: {
                    get: () => data.score,
                },
                votes: {
                    get: () => data.votes,
                },
                clientID: {
                    get: () => data.clientID,
                },
                serverID: {
                    get: () => data.serverID,
                },
                label: {
                    get: () => data.label,
                    set: (label) => {
                        data.updateFlags.label = true;
                        if (!(label instanceof Label)) {
                            throw new ArgumentError(
                                `Label must be an instance of Label class, got ${typeof label}`,
                            );
                        }

                        if (label.id! === data.label.id) {
                            return;
                        }

                        data.label = label;
                    },
                },
                start: {
                    get: () => data.start,
                    set: (start) => {
                        if (typeof start !== 'number') {
                            throw new ArgumentError('Start is expected to be a number.');
                        }

                        if (start === data.start) {
                            return;
                        }

                        data.updateFlags.position = true;
                        data.start = start;
                    },
                },
                stop: {
                    get: () => data.stop,
                    set: (stop) => {
                        if (stop !== null && typeof stop !== 'number') {
                            throw new ArgumentError('Stop is expected to be a number or null.');
                        }

                        if (stop === data.stop) {
                            return;
                        }

                        data.updateFlags.position = true;
                        data.stop = stop;
                    },
                },
                color: {
                    get: () => data.color,
                    set: (color) => {
                        data.updateFlags.color = true;
                        data.color = color;
                    },
                },
                hidden: {
                    get: () => data.hidden,
                    set: (hidden) => {
                        if (typeof hidden !== 'boolean') {
                            throw new ArgumentError('Hidden is expected to be a boolean.');
                        }

                        if (hidden === data.hidden) {
                            return;
                        }

                        data.updateFlags.hidden = true;
                        data.hidden = hidden;
                    },
                },
                lock: {
                    get: () => data.lock,
                    set: (lock) => {
                        if (typeof lock !== 'boolean') {
                            throw new ArgumentError('Lock is expected to be a boolean.');
                        }

                        if (lock === data.lock) {
                            return;
                        }

                        data.updateFlags.lock = true;
                        data.lock = lock;
                    },
                },
                updated: {
                    get: () => data.updated,
                },
                attributes: {
                    get: () => data.attributes,
                    set: (attributes) => {
                        if (typeof attributes !== 'object') {
                            throw new ArgumentError(
                                'Attributes are expected to be an object ' +
                                    `but got ${
                                        typeof attributes === 'object' ?
                                            attributes.constructor.name :
                                            typeof attributes
                                    }`,
                            );
                        }

                        for (const attrID of Object.keys(attributes)) {
                            data.updateFlags.attributes = true;
                            data.attributes[attrID] = attributes[attrID];
                        }
                    },
                },
            }),
        );

        if (typeof serialized.hidden === 'boolean') {
            data.hidden = serialized.hidden;
        }
        if (typeof serialized.color === 'string') {
            data.color = serialized.color;
        }
        if (typeof serialized.attributes === 'object') {
            data.attributes = serialized.attributes;
        }

        /* eslint-disable-next-line no-underscore-dangle */
        if (serialized.__internal) {
            /* eslint-disable-next-line no-underscore-dangle */
            this.__internal = serialized.__internal;
        }
    }

    async save(): Promise<AudioIntervalState> {
        const result = await PluginRegistry.apiWrapper.call(this, AudioIntervalState.prototype.save);
        return result;
    }

    async delete(force = false): Promise<boolean> {
        const result = await PluginRegistry.apiWrapper.call(this, AudioIntervalState.prototype.delete, force);
        return result;
    }

    async export(): Promise<SerializedInterval> {
        const result = await PluginRegistry.apiWrapper.call(this, AudioIntervalState.prototype.export);
        return result;
    }

    /**
     * Creates a new unsaved audio interval state from user input.
     * The returned state is intended to be passed to AnnotationCollection.put().
     */
    static create(body: {
        label: Label;
        start: number;
        stop: number | null;
        source: Source;
    }): AudioIntervalState {
        return new AudioIntervalState({
            objectType: ObjectType.INTERVAL,
            clientID: null,
            serverID: null,
            label: body.label,
            start: body.start,
            stop: body.stop,
            color: body.label.color!,
            lock: false,
            updated: Date.now(),
            source: body.source,
            score: 1,
            votes: 0,
            hidden: false,
            attributes: {},
        });
    }
}

Object.defineProperty(AudioIntervalState.prototype.save, 'implementation', {
    value: function saveImplementation(): AudioIntervalState {
        if (this.__internal && this.__internal.save) {
            return this.__internal.save(this);
        }

        throw new Error('Could not save audio interval state. Context is not provided.');
    },
    writable: false,
});

Object.defineProperty(AudioIntervalState.prototype.export, 'implementation', {
    value: function exportImplementation(): SerializedInterval | AudioIntervalState {
        if (this.__internal && this.__internal.export) {
            return this.__internal.export();
        }

        throw new Error('Could not export audio interval state. Context is not provided.');
    },
    writable: false,
});

Object.defineProperty(AudioIntervalState.prototype.delete, 'implementation', {
    value: function deleteImplementation(force: boolean): boolean {
        if (this.__internal && this.__internal.delete) {
            return this.__internal.delete(null, force);
        }

        throw new Error('Could not delete audio interval state. Context is not provided.');
    },
    writable: false,
});
