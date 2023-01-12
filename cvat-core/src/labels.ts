// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ShapeType, AttributeType } from './enums';
import { ArgumentError } from './exceptions';

type AttrInputType = 'select' | 'radio' | 'checkbox' | 'number' | 'text';

export interface RawAttribute {
    name: string;
    mutable: boolean;
    input_type: AttrInputType;
    default_value: string;
    values: string[];
    id?: number;
}

export class Attribute {
    public id?: number;
    public defaultValue: string;
    public inputType: AttrInputType;
    public mutable: boolean;
    public name: string;
    public values: string[];

    constructor(initialData: RawAttribute) {
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
                id: {
                    get: () => data.id,
                },
                defaultValue: {
                    get: () => data.default_value,
                },
                inputType: {
                    get: () => data.input_type,
                },
                mutable: {
                    get: () => data.mutable,
                },
                name: {
                    get: () => data.name,
                },
                values: {
                    get: () => [...data.values],
                },
            }),
        );
    }

    toJSON(): RawAttribute {
        const object: RawAttribute = {
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

type LabelType = 'rectangle' | 'polygon' | 'polyline' | 'points' | 'ellipse' | 'cuboid' | 'skeleton' | 'mask' | 'tag' | 'any';
export interface RawLabel {
    id?: number;
    name: string;
    color?: string;
    type: LabelType;
    svg?: string;
    sublabels?: RawLabel[];
    has_parent?: boolean;
    deleted?: boolean;
    attributes: RawAttribute[];
}

export class Label {
    public name: string;
    public readonly id?: number;
    public readonly color?: string;
    public readonly attributes: Attribute[];
    public readonly type: LabelType;
    public structure: {
        sublabels: Label[];
        svg: string;
    } | null;
    public deleted: boolean;
    public readonly hasParent?: boolean;

    constructor(initialData: RawLabel) {
        const data = {
            id: undefined,
            name: undefined,
            color: undefined,
            type: undefined,
            structure: undefined,
            has_parent: false,
            deleted: false,
            svg: undefined,
            elements: undefined,
            sublabels: undefined,
            attributes: [],
        };

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

        if (data.type === 'skeleton') {
            data.sublabels = data.sublabels.map((internalLabel) => new Label({ ...internalLabel, has_parent: true }));
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                name: {
                    get: () => data.name,
                    set: (name) => {
                        if (typeof name !== 'string') {
                            throw new ArgumentError(`Name must be a string, but ${typeof name} was given`);
                        }
                        data.name = name;
                    },
                },
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
                attributes: {
                    get: () => [...data.attributes],
                },
                type: {
                    get: () => data.type,
                },
                structure: {
                    get: () => {
                        if (data.type === ShapeType.SKELETON) {
                            return {
                                svg: data.svg,
                                sublabels: [...data.sublabels],
                            };
                        }

                        return null;
                    },
                },
                deleted: {
                    get: () => data.deleted,
                    set: (value) => {
                        data.deleted = value;
                    },
                },
                hasParent: {
                    get: () => data.has_parent,
                },
            }),
        );
    }

    toJSON(): RawLabel {
        const object: RawLabel = {
            name: this.name,
            attributes: [...this.attributes.map((el) => el.toJSON())],
            type: this.type,
        };

        if (typeof this.color !== 'undefined') {
            object.color = this.color;
        }

        if (typeof this.id !== 'undefined') {
            object.id = this.id;
        }

        if (this.deleted) {
            object.deleted = this.deleted;
        }

        if (this.type) {
            object.type = this.type;
        }

        const { structure } = this;
        if (structure) {
            object.svg = structure.svg;
            object.sublabels = structure.sublabels.map((internalLabel) => internalLabel.toJSON());
        }

        return object;
    }
}
