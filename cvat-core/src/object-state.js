/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');
    const { ArgumentError } = require('./exceptions');

    /**
        * Class representing a state of an object on a specific frame
        * @memberof module:API.cvat.classes
    */
    class ObjectState {
        /**
            * @param {Object} serialized - is an dictionary which contains
            * initial information about an ObjectState;
            * </br> Necessary fields: objectType, shapeType, frame, updated, group
            * </br> Optional fields: keyframes, clientID, serverID
            * </br> Optional fields which can be set later: points, zOrder, outside,
            * occluded, hidden, attributes, lock, label, color, keyframe
        */
        constructor(serialized) {
            const data = {
                label: null,
                attributes: {},

                points: null,
                outside: null,
                occluded: null,
                keyframe: null,

                zOrder: null,
                lock: null,
                color: null,
                hidden: null,
                pinned: null,
                keyframes: serialized.keyframes,
                group: serialized.group,
                updated: serialized.updated,

                clientID: serialized.clientID,
                serverID: serialized.serverID,

                frame: serialized.frame,
                objectType: serialized.objectType,
                shapeType: serialized.shapeType,
                updateFlags: {},
            };

            // Shows whether any properties updated since last reset() or interpolation
            Object.defineProperty(data.updateFlags, 'reset', {
                value: function reset() {
                    this.label = false;
                    this.attributes = false;

                    this.points = false;
                    this.outside = false;
                    this.occluded = false;
                    this.keyframe = false;

                    this.zOrder = false;
                    this.pinned = false;
                    this.lock = false;
                    this.color = false;
                    this.hidden = false;

                    return reset;
                },
                writable: false,
            });

            Object.defineProperties(this, Object.freeze({
                // Internal property. We don't need document it.
                updateFlags: {
                    get: () => data.updateFlags,
                },
                frame: {
                    /**
                        * @name frame
                        * @type {integer}
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
                        * @type {module:API.cvat.enums.ObjectShape}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @readonly
                        * @instance
                    */
                    get: () => data.shapeType,
                },
                clientID: {
                    /**
                        * @name clientID
                        * @type {integer}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @readonly
                        * @instance
                    */
                    get: () => data.clientID,
                },
                serverID: {
                    /**
                        * @name serverID
                        * @type {integer}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @readonly
                        * @instance
                    */
                    get: () => data.serverID,
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
                    get: () => data.hidden,
                    set: (hidden) => {
                        data.updateFlags.hidden = true;
                        data.hidden = hidden;
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
                    get: () => data.points,
                    set: (points) => {
                        if (Array.isArray(points)) {
                            data.updateFlags.points = true;
                            data.points = [...points];
                        } else {
                            throw new ArgumentError(
                                'Points are expected to be an array '
                                    + `but got ${typeof (points) === 'object'
                                        ? points.constructor.name : typeof (points)}`,
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
                    get: () => data.outside,
                    set: (outside) => {
                        data.updateFlags.outside = true;
                        data.outside = outside;
                    },
                },
                keyframe: {
                    /**
                        * @name keyframe
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                    */
                    get: () => data.keyframe,
                    set: (keyframe) => {
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
                        if (typeof (data.keyframes) === 'object') {
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
                    get: () => data.occluded,
                    set: (occluded) => {
                        data.updateFlags.occluded = true;
                        data.occluded = occluded;
                    },
                },
                lock: {
                    /**
                        * @name lock
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                    */
                    get: () => data.lock,
                    set: (lock) => {
                        data.updateFlags.lock = true;
                        data.lock = lock;
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
                        if (typeof (data.pinned) === 'boolean') {
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
                        if (typeof (attributes) !== 'object') {
                            throw new ArgumentError(
                                'Attributes are expected to be an object '
                                    + `but got ${typeof (attributes) === 'object'
                                        ? attributes.constructor.name : typeof (attributes)}`,
                            );
                        }

                        for (const attrID of Object.keys(attributes)) {
                            data.updateFlags.attributes = true;
                            data.attributes[attrID] = attributes[attrID];
                        }
                    },
                },
            }));

            this.label = serialized.label;
            this.lock = serialized.lock;

            if (typeof (serialized.zOrder) === 'number') {
                this.zOrder = serialized.zOrder;
            }
            if (typeof (serialized.occluded) === 'boolean') {
                this.occluded = serialized.occluded;
            }
            if (typeof (serialized.outside) === 'boolean') {
                this.outside = serialized.outside;
            }
            if (typeof (serialized.keyframe) === 'boolean') {
                this.keyframe = serialized.keyframe;
            }
            if (typeof (serialized.pinned) === 'boolean') {
                this.pinned = serialized.pinned;
            }
            if (typeof (serialized.hidden) === 'boolean') {
                this.hidden = serialized.hidden;
            }
            if (typeof (serialized.color) === 'string') {
                this.color = serialized.color;
            }
            if (Array.isArray(serialized.points)) {
                this.points = serialized.points;
            }
            if (typeof (serialized.attributes) === 'object') {
                this.attributes = serialized.attributes;
            }

            data.updateFlags.reset();
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
        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.save);
            return result;
        }

        /**
            * Method deletes an object from a collection
            * @method delete
            * @memberof module:API.cvat.classes.ObjectState
            * @readonly
            * @instance
            * @param {boolean} [force=false] delete object even if it is locked
            * @async
            * @returns {boolean} true if object has been deleted
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async delete(force = false) {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.delete, force);
            return result;
        }
    }

    // Updates element in collection which contains it
    ObjectState.prototype.save.implementation = async function () {
        if (this.__internal && this.__internal.save) {
            return this.__internal.save();
        }

        return this;
    };

    // Delete element from a collection which contains it
    ObjectState.prototype.delete.implementation = async function (force) {
        if (this.__internal && this.__internal.delete) {
            return this.__internal.delete(force);
        }

        return false;
    };

    module.exports = ObjectState;
})();
