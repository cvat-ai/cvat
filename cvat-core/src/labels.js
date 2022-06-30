// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const { AttributeType } = require('./enums');
    const { ArgumentError } = require('./exceptions');

    /**
     * Class representing an attribute
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Attribute {
        constructor(initialData) {
            const data = {
                id: undefined,
                default_value: undefined,
                input_type: undefined,
                mutable: undefined,
                name: undefined,
                values: undefined,
            };

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                        if (Array.isArray(initialData[key])) {
                            data[key] = [...initialData[key]];
                        } else {
                            data[key] = initialData[key];
                        }
                    }
                }
            }

            if (!Object.values(AttributeType).includes(data.input_type)) {
                throw new ArgumentError(`Got invalid attribute type ${data.input_type}`);
            }

            Object.defineProperties(
                this,
                Object.freeze({
                    /**
                     * @name id
                     * @type {number}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    id: {
                        get: () => data.id,
                    },
                    /**
                     * @name defaultValue
                     * @type {(string|integer|boolean)}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    defaultValue: {
                        get: () => data.default_value,
                    },
                    /**
                     * @name inputType
                     * @type {module:API.cvat.enums.AttributeType}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    inputType: {
                        get: () => data.input_type,
                    },
                    /**
                     * @name mutable
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    mutable: {
                        get: () => data.mutable,
                    },
                    /**
                     * @name name
                     * @type {string}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    name: {
                        get: () => data.name,
                    },
                    /**
                     * @name values
                     * @type {(string[]|integer[]|boolean[])}
                     * @memberof module:API.cvat.classes.Attribute
                     * @readonly
                     * @instance
                     */
                    values: {
                        get: () => [...data.values],
                    },
                }),
            );
        }

        toJSON() {
            const object = {
                name: this.name,
                mutable: this.mutable,
                input_type: this.inputType,
                default_value: this.defaultValue,
                values: this.values,
            };

            if (typeof this.id !== 'undefined') {
                object.id = this.id;
            }

            return object;
        }
    }

    /**
     * Class representing a label
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Label {
        constructor(initialData) {
            const data = {
                id: undefined,
                name: undefined,
                color: undefined,
                type: undefined,
                structure: undefined,
                parent: undefined,
                deleted: false,
            };

            if (initialData.type === 'skeleton' && !initialData.structure) {
                initialData.structure = {
                    svg: initialData.svg,
                    edges: initialData.edges,
                    elements: initialData.elements,
                    sublabels: initialData.sublabels,
                };

                delete initialData.svg;
                delete initialData.edges;
                delete initialData.elements;
                delete initialData.sublabels;
            }

            for (const key of Object.keys(data)) {
                if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                    data[key] = initialData[key];
                }
            }

            data.attributes = [];

            if (
                Object.prototype.hasOwnProperty.call(initialData, 'attributes') &&
                Array.isArray(initialData.attributes)
            ) {
                for (const attrData of initialData.attributes) {
                    data.attributes.push(new Attribute(attrData));
                }
            }

            if (data.structure) {
                data.structure = {
                    svg: data.structure.svg,
                    sublabels: data.structure.sublabels.map((internalLabel) => new Label(internalLabel)),
                    elements: data.structure.elements.map((element) => ({ ...element })),
                    edges: data.structure.edges.map((edge) => ({ ...edge })),
                };
            }

            Object.defineProperties(
                this,
                Object.freeze({
                    /**
                     * @name id
                     * @type {number}
                     * @memberof module:API.cvat.classes.Label
                     * @readonly
                     * @instance
                     */
                    id: {
                        get: () => data.id,
                    },
                    /**
                     * @name name
                     * @type {string}
                     * @memberof module:API.cvat.classes.Label
                     * @instance
                     */
                    name: {
                        get: () => data.name,
                        set: (name) => {
                            if (typeof name !== 'string') {
                                throw new ArgumentError(`Name must be a string, but ${typeof name} was given`);
                            }
                            data.name = name;
                        },
                    },
                    /**
                     * @name color
                     * @type {string}
                     * @memberof module:API.cvat.classes.Label
                     * @instance
                     */
                    color: {
                        get: () => data.color,
                        set: (color) => {
                            if (typeof color === 'string' && color.match(/^#[0-9a-f]{6}$|^$/)) {
                                data.color = color;
                            } else {
                                throw new ArgumentError('Trying to set wrong color format');
                            }
                        },
                    },
                    /**
                     * @name attributes
                     * @type {module:API.cvat.classes.Attribute[]}
                     * @memberof module:API.cvat.classes.Label
                     * @readonly
                     * @instance
                     */
                    attributes: {
                        get: () => [...data.attributes],
                    },
                    /**
                     * @typedef {Object} SkeletonStructure
                     * @property {module:API.cvat.classes.Label[]} sublabels A list of labels the skeleton includes
                     * @property {Object[]} edges A list of edges the skeleton includes
                     * @property {Object[]} elements A list of elements the skeleton consists of
                     * @property {Object[]} svg An SVG representation of the skeleton
                     * A type of a file
                     * @global
                     */
                    /**
                     * @name type
                     * @type {string | undefined}
                     * @memberof module:API.cvat.classes.Label
                     * @readonly
                     * @instance
                     */
                    type: {
                        get: () => {
                            if (data.type instanceof Object) {
                                return { ...data.type };
                            }
                            return data.type;
                        },
                    },
                    /**
                     * @name type
                     * @type {SkeletonStructure | undefined}
                     * @memberof module:API.cvat.classes.Label
                     * @readonly
                     * @instance
                     */
                    structure: {
                        get: () => {
                            if (data.structure instanceof Object) {
                                return { ...data.structure };
                            }
                            return data.structure;
                        },
                    },
                    /**
                     * @name deleted
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.Label
                     * @instance
                     */
                    deleted: {
                        get: () => data.deleted,
                        set: (value) => {
                            data.deleted = value;
                        },
                    },
                    /**
                     * @name hasParent
                     * @type {boolean}
                     * @memberof module:API.cvat.classes.Label
                     * @readonly
                     * @instance
                     */
                    hasParent: {
                        get: () => data.parent,
                    },
                }),
            );
        }

        toJSON() {
            const object = {
                name: this.name,
                attributes: [...this.attributes.map((el) => el.toJSON())],
                color: this.color,
            };

            if (typeof this.id !== 'undefined') {
                object.id = this.id;
            }

            if (this.deleted) {
                object.deleted = this.deleted;
            }

            if (this.type) {
                object.type = this.type;
            }

            if (this.structure) {
                object.svg = this.structure.svg;
                object.sublabels = this.structure.sublabels.map((internalLabel) => internalLabel.toJSON());
                object.elements = this.structure.elements.map((element) => ({ ...element }));
                object.edges = this.structure.edges.map((edge) => ({ ...edge }));
            }

            return object;
        }
    }

    module.exports = {
        Attribute,
        Label,
    };
})();
