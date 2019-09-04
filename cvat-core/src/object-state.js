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
            * Necessary fields: objectType, shapeType
            * (don't have setters)
            * Necessary fields for objects which haven't been added to collection yet: frame
            * (doesn't have setters)
            * Optional fields: points, group, zOrder, outside, occluded,
            * attributes, lock, label, mode, color, keyframe, clientID, serverID
            * These fields can be set later via setters
        */
        constructor(serialized) {
            const data = {
                label: null,
                attributes: {},

                points: null,
                outside: null,
                occluded: null,
                keyframe: null,

                group: null,
                zOrder: null,
                lock: null,
                color: null,
                visibility: null,

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

                    this.group = false;
                    this.zOrder = false;
                    this.lock = false;
                    this.color = false;
                    this.visibility = false;
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
                visibility: {
                    /**
                        * @name visibility
                        * @type {module:API.cvat.enums.VisibleState}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                    */
                    get: () => data.visibility,
                    set: (visibility) => {
                        data.updateFlags.visibility = true;
                        data.visibility = visibility;
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
                        * @name group
                        * @type {integer}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                    */
                    get: () => data.group,
                    set: (group) => {
                        data.updateFlags.group = true;
                        data.group = group;
                    },
                },
                zOrder: {
                    /**
                        * @name zOrder
                        * @type {integer}
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
            this.group = serialized.group;
            this.zOrder = serialized.zOrder;
            this.outside = serialized.outside;
            this.keyframe = serialized.keyframe;
            this.occluded = serialized.occluded;
            this.color = serialized.color;
            this.lock = serialized.lock;
            this.visibility = serialized.visibility;

            // It can be undefined in a constructor and it can be defined later
            if (typeof (serialized.points) !== 'undefined') {
                this.points = serialized.points;
            }
            if (typeof (serialized.attributes) !== 'undefined') {
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

        /**
            * Set the highest ZOrder within a frame
            * @method up
            * @memberof module:API.cvat.classes.ObjectState
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async up() {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.up);
            return result;
        }

        /**
            * Set the lowest ZOrder within a frame
            * @method down
            * @memberof module:API.cvat.classes.ObjectState
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async down() {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.down);
            return result;
        }
    }

    // Updates element in collection which contains it
    ObjectState.prototype.save.implementation = async function () {
        if (this.hidden && this.hidden.save) {
            return this.hidden.save();
        }

        return this;
    };

    // Delete element from a collection which contains it
    ObjectState.prototype.delete.implementation = async function (force) {
        if (this.hidden && this.hidden.delete) {
            return this.hidden.delete(force);
        }

        return false;
    };

    ObjectState.prototype.up.implementation = async function () {
        if (this.hidden && this.hidden.up) {
            return this.hidden.up();
        }

        return false;
    };

    ObjectState.prototype.down.implementation = async function () {
        if (this.hidden && this.hidden.down) {
            return this.hidden.down();
        }

        return false;
    };


    module.exports = ObjectState;
})();
