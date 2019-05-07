/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');

    /**
        * Class representing a state of an object on a specific frame
        * @memberof module:API.cvat.classes
    */
    class ObjectState {
        /**
            * @param {module:API.cvat.enums.ObjectType} type - a type of an object
            * @param {module:API.cvat.enums.ObjectShape} shape -
            * a type of a shape if an object is a shape of a track
            * @param {module:API.cvat.classes.Label} label - a label of an object
        */
        constructor(type, shape, label) {
            const data = {
                position: null,
                group: null,
                zOrder: null,
                outside: false,
                occluded: false,
                attributes: null,
                lock: false,
                type,
                shape,
                label,
            };

            Object.defineProperties(this, Object.freeze({
                type: {
                    /**
                        * @name type
                        * @type {module:API.cvat.enums.ShapeType}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @readonly
                        * @instance
                    */
                    get: () => data.type,
                },
                shape: {
                    /**
                        * @name shape
                        * @type {module:API.cvat.enums.ShapeType}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @readonly
                        * @instance
                    */
                    get: () => data.shape,
                },
                label: {
                    /**
                        * @name shape
                        * @type {module:API.cvat.classes.Label}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.label,
                    set: (labelInstance) => {
                        if (!(labelInstance instanceof window.cvat.classes.Label)) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected Label instance, but got "${typeof (labelInstance.constructor.name)}"`,
                            );
                        }

                        data.label = labelInstance;
                    },
                },
                position: {
                    /**
                        * @typedef {Object} Point
                        * @property {number} x
                        * @property {number} y
                        * @global
                    */
                    /**
                        * @name position
                        * @type {Point[]}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.position,
                    set: (position) => {
                        if (Array.isArray(position)) {
                            for (const point of position) {
                                if (typeof (point) !== 'object'
                                    || !('x' in point) || !('y' in point)) {
                                    throw new window.cvat.exceptions.ArgumentException(
                                        `Got invalid point ${point}`,
                                    );
                                }
                            }
                        } else {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Got invalid type "${typeof (position.constructor.name)}"`,
                            );
                        }

                        data.position = position;
                    },
                },
                group: {
                    /**
                        * @name group
                        * @type {integer}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.group,
                    set: (groupID) => {
                        if (!Number.isInteger(groupID)) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected integer, but got ${groupID.constructor.name}`,
                            );
                        }

                        data.group = groupID;
                    },
                },
                zOrder: {
                    /**
                        * @name zOrder
                        * @type {integer}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.zOrder,
                    set: (zOrder) => {
                        if (!Number.isInteger(zOrder)) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected integer, but got ${zOrder.constructor.name}`,
                            );
                        }

                        data.zOrder = zOrder;
                    },
                },
                outside: {
                    /**
                        * @name outside
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.outside,
                    set: (outside) => {
                        if (!(typeof (outside) !== 'boolean')) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected integer, but got ${outside.constructor.name}`,
                            );
                        }

                        data.outside = outside;
                    },
                },
                occluded: {
                    /**
                        * @name occluded
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.occluded,
                    set: (occluded) => {
                        if (!(typeof (occluded) !== 'boolean')) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected integer, but got ${occluded.constructor.name}`,
                            );
                        }

                        data.occluded = occluded;
                    },
                },
                lock: {
                    /**
                        * @name lock
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.ObjectState
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.lock,
                    set: (lock) => {
                        if (!(typeof (lock) !== 'boolean')) {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected integer, but got ${lock.constructor.name}`,
                            );
                        }

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
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.attributes,
                    set: (attributes) => {
                        if (typeof (attributes) !== 'object') {
                            throw new window.cvat.exceptions.ArgumentException(
                                `Expected object, but got ${attributes.constructor.name}`,
                            );
                        }

                        for (let attrId in attributes) {
                            if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                                attrId = +attrId;
                                if (!Number.isInteger(attrId)) {
                                    throw new window.cvat.exceptions.ArgumentException(
                                        `Expected integer attribute id, but got ${attrId.constructor.name}`,
                                    );
                                }

                                data.attributes[attrId] = attributes[attrId];
                            }
                        }
                    },
                },
            }));
        }

        /**
            * Method saves object state in a collection
            * @method save
            * @memberof module:API.cvat.classes.ObjectState
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.save);
            return result;
        }

        /**
            * Method deletes object from a collection
            * @method delete
            * @memberof module:API.cvat.classes.ObjectState
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async delete() {
            const result = await PluginRegistry
                .apiWrapper.call(this, ObjectState.prototype.delete);
            return result;
        }
    }


    module.exports = ObjectState;
})();
