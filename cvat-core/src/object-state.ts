// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Source, ShapeType, ObjectType } from './enums';
import PluginRegistry from './plugins';
import { ArgumentError } from './exceptions';
import { Label } from './labels';
import { isEnum } from './common';

interface UpdateFlags {
    label: boolean;
    attributes: boolean;
    description: boolean;
    points: boolean;
    rotation: boolean;
    outside: boolean;
    occluded: boolean;
    keyframe: boolean;
    zOrder: boolean;
    pinned: boolean;
    lock: boolean;
    color: boolean;
    hidden: boolean;
    descriptions: boolean;
    reset: () => void;
}

interface SerializedData {
    objectType: ObjectType;
    label: Label;
    frame: number;

    shapeType?: ShapeType;
    clientID?: number;
    serverID?: number;
    parentID?: number;
    lock?: boolean;
    hidden?: boolean;
    pinned?: boolean;
    attributes?: Record<number, string>;
    group?: { color: string; id: number; };
    color?: string;
    updated?: number;
    source?: Source;
    zOrder?: number;
    points?: number[];
    occluded?: boolean;
    outside?: boolean;
    keyframe?: boolean;
    rotation?: number;
    descriptions?: string[];
    keyframes?: {
        prev: number | null;
        next: number | null;
        first: number | null;
        last: number | null;
    };
    elements?: SerializedData[];
    __internal: {
        save: (objectState: ObjectState) => ObjectState;
        delete: (frame: number, force: boolean) => boolean;
    };
}

/**
 * Class representing a state of an object on a specific frame
 * @memberof module:API.cvat.classes
*/
export default class ObjectState {
    private readonly __internal: {
        save: (objectState: ObjectState) => ObjectState;
        delete: (frame: number, force: boolean) => boolean;
    };

    public readonly updateFlags: UpdateFlags;
    public readonly frame: number;
    public readonly objectType: ObjectType;
    public readonly shapeType: ShapeType;
    public readonly source: Source;
    public readonly clientID: number | null;
    public readonly serverID: number | null;
    public readonly parentID: number | null;
    public readonly updated: number;
    public readonly group: { color: string; id: number; } | null;
    public readonly keyframes: {
        first: number | null;
        prev: number | null;
        next: number | null;
        last: number | null;
    } | null;
    public label: Label;
    public color: string;
    public hidden: boolean;
    public pinned: boolean;
    public points: number[] | null;
    public rotation: number | null;
    public zOrder: number;
    public outside: boolean;
    public occluded: boolean;
    public keyframe: boolean;
    public lock: boolean;
    public attributes: Record<number, string>;
    public descriptions: string[];
    public elements: ObjectState[];

    /**
     * @param {Object} serialized - is an dictionary which contains
     * initial information about an ObjectState;
     * </br> Necessary fields: objectType, shapeType, frame, updated, group
     * </br> Optional fields: keyframes, clientID, serverID, parentID
     * </br> Optional fields which can be set later: points, zOrder, outside,
     * occluded, hidden, attributes, lock, label, color, keyframe, source
     */
    constructor(serialized: SerializedData) {
        if (!isEnum.call(ObjectType, serialized.objectType)) {
            throw new ArgumentError(
                `ObjectState must be provided its objectType, got wrong value ${serialized.objectType}`,
            );
        }

        if (!(serialized.label instanceof Label)) {
            throw new ArgumentError(
                `ObjectState must be provided correct Label, got wrong value ${serialized.label}`,
            );
        }

        if (!Number.isInteger(serialized.frame)) {
            throw new ArgumentError(
                `ObjectState must be provided correct frame, got wrong value ${serialized.frame}`,
            );
        }

        const updateFlags: UpdateFlags = {} as UpdateFlags;
        // Shows whether any properties updated since the object initialization
        Object.defineProperty(updateFlags, 'reset', {
            value: function reset() {
                this.label = false;
                this.attributes = false;
                this.descriptions = false;

                this.points = false;
                this.rotation = false;
                this.outside = false;
                this.occluded = false;
                this.keyframe = false;

                this.zOrder = false;
                this.pinned = false;
                this.lock = false;
                this.color = false;
                this.hidden = false;
                this.descriptions = false;

                return reset;
            },
            writable: false,
            enumerable: false,
        });

        const data = {
            label: serialized.label,
            attributes: {},
            descriptions: [],
            elements: Array.isArray(serialized.elements) ?
                serialized.elements.map((element) => new ObjectState(element)) : null,

            points: null,
            rotation: null,
            outside: false,
            occluded: false,
            keyframe: true,

            zOrder: 0,
            lock: serialized.lock || false,
            color: '#000000',
            hidden: false,
            pinned: false,
            source: Source.MANUAL,
            keyframes: serialized.keyframes || null,
            group: serialized.group || null,
            updated: serialized.updated || Date.now(),

            clientID: serialized.clientID || null,
            serverID: serialized.serverID || null,
            parentID: serialized.parentID || null,

            frame: serialized.frame,
            objectType: serialized.objectType,
            shapeType: serialized.shapeType || null,
            updateFlags,
        };

        Object.defineProperties(
            this,
            Object.freeze({
                // Internal property. We don't need document it.
                updateFlags: {
                    get: () => data.updateFlags,
                },
                frame: {
                    /**
                     * @name frame
                     * @type {number}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.frame,
                },
                objectType: {
                    /**
                     * @name objectType
                     * @type {module:API.cvat.enums.ObjectType}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.objectType,
                },
                shapeType: {
                    /**
                     * @name shapeType
                     * @type {module:API.cvat.enums.ShapeType}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.shapeType,
                },
                source: {
                    /**
                     * @name source
                     * @type {module:API.cvat.enums.Source}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.source,
                },
                clientID: {
                    /**
                     * @name clientID
                     * @type {number}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.clientID,
                },
                serverID: {
                    /**
                     * @name serverID
                     * @type {number}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.serverID,
                },
                parentID: {
                    /**
                     * @name parentID
                     * @type {number | null}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => data.parentID,
                },
                label: {
                    /**
                     * @name shape
                     * @type {module:API.cvat.classes.Label}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => data.label,
                    set: (labelInstance) => {
                        data.updateFlags.label = true;
                        data.label = labelInstance;
                    },
                },
                color: {
                    /**
                     * @name color
                     * @type {string}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => data.color,
                    set: (color) => {
                        data.updateFlags.color = true;
                        data.color = color;
                    },
                },
                hidden: {
                    /**
                     * @name hidden
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((element: ObjectState) => element.hidden);
                        }

                        return data.hidden;
                    },
                    set: (hidden) => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            data.elements.forEach((element: ObjectState) => {
                                element.hidden = hidden;
                            });
                        } else {
                            data.updateFlags.hidden = true;
                            data.hidden = hidden;
                        }
                    },
                },
                points: {
                    /**
                     * @name points
                     * @type {number[]}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.map((element) => element.points).flat();
                        }

                        if (Array.isArray(data.points)) {
                            return [...data.points];
                        }

                        return [];
                    },
                    set: (points) => {
                        if (!Array.isArray(points) || points.some((coord) => typeof coord !== 'number')) {
                            throw new ArgumentError(
                                'Points are expected to be an array of numbers ' +
                                    `but got ${
                                        typeof points === 'object' ? points.constructor.name : typeof points
                                    }`,
                            );
                        }

                        if (data.shapeType === ShapeType.SKELETON) {
                            const { points: currentPoints } = this;
                            if (points.length !== currentPoints.length) {
                                throw new ArgumentError(
                                    'Tried to set wrong number of points for a skeleton' +
                                    `(${points.length} vs ${currentPoints.length}})`,
                                );
                            }

                            const copy = points;
                            for (const element of this.elements) {
                                element.points = copy.splice(0, element.points.length);
                            }
                        } else {
                            data.updateFlags.points = true;
                        }

                        data.points = [...points];
                    },
                },
                rotation: {
                    /**
                     * @name rotation
                     * @description angle measured by degrees
                     * @type {number}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     * @instance
                     */
                    get: () => data.rotation,
                    set: (rotation) => {
                        if (typeof rotation === 'number') {
                            if (rotation === data.rotation) return;
                            data.updateFlags.rotation = true;
                            data.rotation = rotation;
                        } else {
                            throw new ArgumentError(
                                `Rotation is expected to be a number, but got ${
                                    typeof rotation === 'object' ? rotation.constructor.name : typeof rotation
                                }`,
                            );
                        }
                    },
                },
                group: {
                    /**
                     * Object with short group info { color, id }
                     * @name group
                     * @type {object}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     * @readonly
                     */
                    get: () => data.group,
                },
                zOrder: {
                    /**
                     * @name zOrder
                     * @type {integer | null}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => data.zOrder,
                    set: (zOrder) => {
                        data.updateFlags.zOrder = true;
                        data.zOrder = zOrder;
                    },
                },
                outside: {
                    /**
                     * @name outside
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.outside);
                        }
                        return data.outside;
                    },
                    set: (outside) => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.outside = outside;
                            }
                        } else {
                            data.outside = outside;
                            data.updateFlags.outside = true;
                        }
                    },
                },
                keyframe: {
                    /**
                     * @name keyframe
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.keyframe || data.elements.some((el) => el.keyframe);
                        }

                        return data.keyframe;
                    },
                    set: (keyframe) => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.keyframe = keyframe;
                            }
                        }

                        data.updateFlags.keyframe = true;
                        data.keyframe = keyframe;
                    },
                },
                keyframes: {
                    /**
                     * Object of keyframes { first, prev, next, last }
                     * @name keyframes
                     * @type {object | null}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @readonly
                     * @instance
                     */
                    get: () => {
                        if (typeof data.keyframes === 'object') {
                            return { ...data.keyframes };
                        }

                        return null;
                    },
                },
                occluded: {
                    /**
                     * @name occluded
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.occluded);
                        }
                        return data.occluded;
                    },
                    set: (occluded) => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.occluded = occluded;
                            }
                        } else {
                            data.occluded = occluded;
                            data.updateFlags.occluded = true;
                        }
                    },
                },
                lock: {
                    /**
                     * @name lock
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.lock);
                        }
                        return data.lock;
                    },
                    set: (lock) => {
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.lock = lock;
                            }
                        } else {
                            data.updateFlags.lock = true;
                            data.lock = lock;
                        }
                    },
                },
                pinned: {
                    /**
                     * @name pinned
                     * @type {boolean | null}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     */
                    get: () => {
                        if (typeof data.pinned === 'boolean') {
                            return data.pinned;
                        }

                        return null;
                    },
                    set: (pinned) => {
                        data.updateFlags.pinned = true;
                        data.pinned = pinned;
                    },
                },
                updated: {
                    /**
                     * Timestamp of the latest updated of the object
                     * @name updated
                     * @type {number}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @instance
                     * @readonly
                     */
                    get: () => data.updated,
                },
                attributes: {
                    /**
                     * Object is id:value pairs where "id" is an integer
                     * attribute identifier and "value" is an attribute value
                     * @name attributes
                     * @type {Object}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     * @instance
                     */
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
                descriptions: {
                    /**
                     * Additional text information displayed on canvas
                     * @name descripttions
                     * @type {string[]}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     * @instance
                     */
                    get: () => [...data.descriptions],
                    set: (descriptions) => {
                        if (
                            !Array.isArray(descriptions) ||
                            descriptions.some((description) => typeof description !== 'string')
                        ) {
                            throw new ArgumentError(
                                `Descriptions are expected to be an array of strings but got ${data.descriptions}`,
                            );
                        }

                        data.updateFlags.descriptions = true;
                        data.descriptions = [...descriptions];
                    },
                },
                elements: {
                    /**
                     * Returns a list of object states for compound objects (like skeletons)
                     * @name elements
                     * @type {string[]}
                     * @memberof module:API.cvat.classes.ObjectState
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     * @readonly
                     * @instance
                     */
                    get: () => {
                        if (data.elements) {
                            return [...data.elements];
                        }
                        return [];
                    },
                },
            }),
        );

        if ([Source.MANUAL, Source.AUTO].includes(serialized.source)) {
            data.source = serialized.source;
        }
        if (typeof serialized.zOrder === 'number') {
            data.zOrder = serialized.zOrder;
        }
        if (typeof serialized.occluded === 'boolean') {
            data.occluded = serialized.occluded;
        }
        if (typeof serialized.outside === 'boolean') {
            data.outside = serialized.outside;
        }
        if (typeof serialized.keyframe === 'boolean') {
            data.keyframe = serialized.keyframe;
        }
        if (typeof serialized.pinned === 'boolean') {
            data.pinned = serialized.pinned;
        }
        if (typeof serialized.hidden === 'boolean') {
            data.hidden = serialized.hidden;
        }
        if (typeof serialized.color === 'string') {
            data.color = serialized.color;
        }
        if (typeof serialized.rotation === 'number') {
            data.rotation = serialized.rotation;
        }
        if (Array.isArray(serialized.points)) {
            data.points = serialized.points;
        }
        if (
            Array.isArray(serialized.descriptions) &&
            serialized.descriptions.every((desc) => typeof desc === 'string')
        ) {
            data.descriptions = serialized.descriptions;
        }
        if (typeof serialized.attributes === 'object') {
            data.attributes = serialized.attributes;
        }

        data.updateFlags.reset();

        /* eslint-disable-next-line no-underscore-dangle */
        if (serialized.__internal) {
            /* eslint-disable-next-line no-underscore-dangle */
            this.__internal = serialized.__internal;
        }
    }

    /**
     * Method saves/updates an object state in a collection
     * @method save
     * @memberof module:API.cvat.classes.ObjectState
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.PluginError}
     * @throws {module:API.cvat.exceptions.ArgumentError}
     * @returns {module:API.cvat.classes.ObjectState} updated state of an object
     */
    async save(): Promise<ObjectState> {
        const result = await PluginRegistry.apiWrapper.call(this, ObjectState.prototype.save);
        return result;
    }

    /**
     * Method deletes an object from a collection
     * @method delete
     * @memberof module:API.cvat.classes.ObjectState
     * @readonly
     * @instance
     * @param {integer} frame current frame number
     * @param {boolean} [force=false] delete object even if it is locked
     * @async
     * @returns {boolean} true if object has been deleted
     * @throws {module:API.cvat.exceptions.PluginError}
     * @throws {module:API.cvat.exceptions.ArgumentError}
     */
    async delete(frame, force = false): Promise<boolean> {
        const result = await PluginRegistry.apiWrapper.call(this, ObjectState.prototype.delete, frame, force);
        return result;
    }
}

Object.defineProperty(ObjectState.prototype.save, 'implementation', {
    value: function save(): ObjectState {
        if (this.__internal && this.__internal.save) {
            return this.__internal.save(this);
        }

        return this;
    },
    writable: false,
});

Object.defineProperty(ObjectState.prototype.delete, 'implementation', {
    value: function remove(frame: number, force: boolean): boolean {
        if (this.__internal && this.__internal.delete) {
            if (!Number.isInteger(+frame) || +frame < 0) {
                throw new ArgumentError('Frame argument must be a non negative integer');
            }

            return this.__internal.delete(frame, force);
        }

        return false;
    },
    writable: false,
});
