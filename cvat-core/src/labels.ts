// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import DOMPurify from 'dompurify';
import _ from 'lodash';
import {
    AttrInputType, SerializedAttribute, SerializedLabel,
} from './server-response-types';
import { ShapeType, AttributeType, LabelType } from './enums';
import { ArgumentError } from './exceptions';

export class Attribute {
    public id?: number;
    public defaultValue: string;
    public deleted: boolean;
    public inputType: AttrInputType;
    public mutable: boolean;
    public name: string;
    public values: string[];

    constructor(initialData: SerializedAttribute) {
        const data = {
            id: undefined,
            default_value: undefined,
            deleted: false,
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

        if (!data.deleted && !Object.values(AttributeType).includes(data.input_type)) {
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
                deleted: {
                    get: () => data.deleted,
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

    toJSON(): SerializedAttribute {
        const object: SerializedAttribute = {
            name: this.name,
            mutable: this.mutable,
            input_type: this.inputType,
            default_value: this.defaultValue,
            values: this.values,
        };

        if (typeof this.id !== 'undefined') {
            object.id = this.id;
        }

        if (this.deleted) {
            object.deleted = true;
        }

        return object;
    }
}

export class Label {
    public name: string;
    public readonly id?: number;
    public readonly color?: string;
    public readonly attributes: Attribute[];
    public readonly type: LabelType;
    public structure: {
        sublabels: Label[];
        svg: SVGSVGElement;
    } | null;
    public deleted: boolean;
    public patched: boolean;
    public readonly hasParent?: boolean;

    constructor(initialData: Readonly<SerializedLabel>) {
        const data = {
            id: undefined,
            name: undefined,
            color: undefined,
            type: undefined,
            structure: undefined,
            has_parent: false,
            deleted: false,
            patched: false,
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
            data.svg = Label.parseUntrustedSvg(`<svg>${data.svg ?? ''}</svg>`);
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
                        if (Number.isInteger(data.id)) {
                            data.patched = true;
                        }
                    },
                },
                color: {
                    get: () => data.color,
                    set: (color) => {
                        if (typeof color === 'string' && color.match(/^#[0-9a-f]{6}$|^$/)) {
                            data.color = color;
                            if (Number.isInteger(data.id)) {
                                data.patched = true;
                            }
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
                patched: {
                    get: () => data.patched,
                    set: (value) => {
                        data.patched = value;
                    },
                },
                hasParent: {
                    get: () => data.has_parent,
                },
            }),
        );
    }

    toJSON(): SerializedLabel {
        const object: SerializedLabel = {
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

        if (this.type) {
            object.type = this.type;
        }

        const { structure } = this;
        if (structure) {
            object.svg = structure.svg.innerHTML;
            object.sublabels = structure.sublabels.map((internalLabel) => internalLabel.toJSON());
        }

        return object;
    }

    equals(other: Label): boolean {
        return _.isEqual(this.toJSON(), other.toJSON());
    }

    static parseUntrustedSvg(svgString: string): SVGSVGElement {
        const frag = DOMPurify.sanitize(svgString, {
            ALLOWED_TAGS: ['svg', 'line', 'circle', 'desc'],
            ALLOWED_ATTR: [
                // circle
                'cx', 'cy', 'r',
                'data-type', 'data-element-id', 'data-label-name', 'data-label-id', 'data-node-id',
                // line
                'x1', 'y1', 'x2', 'y2',
                'data-type', 'data-node-from', 'data-node-to',
                // desc
                'data-description-type',
            ],
            RETURN_DOM_FRAGMENT: true,
        });

        if (frag.children.length !== 1) throw Error();

        const child = frag.firstElementChild;
        if (!(child instanceof SVGSVGElement)) throw Error();

        return child;
    }
}

export function getUpdatedLabels(oldLabels: Label[], newLabels: Label[]): Label[] {
    if (
        !Array.isArray(oldLabels) ||
        !Array.isArray(newLabels) ||
        oldLabels.some((label) => !(label instanceof Label)) ||
        newLabels.some((label) => !(label instanceof Label))
    ) {
        throw new ArgumentError('Old and new labels must be arrays of Labels');
    }

    const oldIDs = new Set(oldLabels.map((label) => label.id));
    const newIDs = new Set(newLabels.map((label) => label.id));
    const updatedLabels: Label[] = [];

    oldLabels.filter((label) => !newIDs.has(label.id))
        .forEach((label) => {
            const deletedLabel = new Label(label.toJSON());
            deletedLabel.deleted = true;
            updatedLabels.push(deletedLabel);
        });

    newLabels.forEach((label) => {
        const { id } = label;
        if (oldIDs.has(id)) {
            const oldLabel = oldLabels.find((_label) => _label.id === id);
            if (oldLabel && !label.equals(oldLabel)) {
                const patchedLabel = new Label(label.toJSON());
                patchedLabel.patched = true;
                updatedLabels.push(patchedLabel);
            }
        }
    });

    updatedLabels.push(...newLabels
        .filter((label) => !Number.isInteger(label.id))
        .map((label) => new Label(label.toJSON())),
    );

    return updatedLabels;
}
