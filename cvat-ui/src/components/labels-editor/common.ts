// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    SerializedLabel, SerializedAttribute, getCore, LabelType,
} from 'cvat-core-wrapper';

export interface SkeletonConfiguration {
    type: 'skeleton';
    svg: string;
    sublabels: SerializedLabel[];
}

export type LabelOptColor = SerializedLabel;

const core = getCore();
let id = 0;

function validateParsedAttribute(attr: SerializedAttribute): void {
    if (typeof attr !== 'object' || attr === null) {
        throw new Error('Attribute must be a JSON object');
    }

    if (typeof attr.name !== 'string') {
        throw new Error('Attribute name must be a string');
    }

    if (attr.name.trim().length === 0) {
        throw new Error('Attribute name must not be empty');
    }

    if (typeof attr.id !== 'undefined' && !Number.isInteger(attr.id)) {
        throw new Error(`Attribute: "${attr.name}": id must be an integer or undefined`);
    }

    if (!['checkbox', 'number', 'text', 'radio', 'select'].includes((attr.input_type ?? '').toLowerCase())) {
        throw new Error(`Attribute: "${attr.name}": unknown input type: ${attr.input_type}`);
    }

    if (typeof attr.mutable !== 'boolean') {
        throw new Error(`Attribute: "${attr.name}": mutable property must be a boolean`);
    }

    if (!Array.isArray(attr.values) || !attr.values.length) {
        throw new Error(`Attribute: "${attr.name}": attribute values must be a non-empty array`);
    }

    for (const value of attr.values) {
        if (typeof value !== 'string') {
            throw new Error(`Attribute: "${attr.name}": each attribute value must be a string`);
        }
    }

    const attrValues = attr.values.map((value: string) => value.trim());
    if (new Set(attrValues).size !== attrValues.length) {
        throw new Error(`Attribute: "${attr.name}": attribute values must be unique`);
    }

    if (attr.default_value) {
        if (!core.utils.validateAttributeValue(attr.default_value, new core.classes.Attribute(attr))) {
            throw new Error(
                `Attribute: "${attr.name}": invalid default value "${attr.default_value}"`,
            );
        }
    }
}

export function validateParsedLabel(label: SerializedLabel): void {
    if (typeof label !== 'object' || label === null) {
        throw new Error('Label must be a JSON object');
    }

    if (typeof label.name !== 'string') {
        throw new Error('Label name must be a string');
    }

    if (label.name.trim().length === 0) {
        throw new Error('Label name must not be empty');
    }

    if (typeof label.id !== 'undefined' && !Number.isInteger(label.id)) {
        throw new Error(`Label "${label.name}": id must be an integer or undefined`);
    }

    if (label.color && typeof label.color !== 'string') {
        throw new Error(`Label "${label.name}": color must be a string`);
    }

    if (label.color && !label.color.match(/^#[0-9a-fA-F]{6}$|^$/)) {
        throw new Error(`Label "${label.name}": color value is invalid`);
    }

    if (!Array.isArray(label.attributes)) {
        throw new Error(`Label "${label.name}": attributes must be an array`);
    }

    for (const attr of label.attributes) {
        validateParsedAttribute(attr);
    }

    const attrNames = label.attributes.map((attr: SerializedAttribute) => attr.name.trim());
    if (new Set(attrNames).size !== attrNames.length) {
        throw new Error(`Label "${label.name}": attributes names must be unique`);
    }

    if (!Object.values(LabelType).includes(label.type)) {
        throw new Error(`Label "${label.name}": unknown label type "${label.type}"`);
    }

    if (label.type === LabelType.SKELETON) {
        if (!Array.isArray(label.sublabels) || label.sublabels.length === 0) {
            throw new Error(`Label "${label.name}": skeletons must provide non-empty sublabels array`);
        }

        for (const sublabel of label.sublabels) {
            validateParsedLabel(sublabel);
        }

        const sublabelsNames = label.sublabels.map((sublabel: SerializedLabel) => sublabel.name.trim());
        if (new Set(sublabelsNames).size !== sublabelsNames.length) {
            throw new Error(`Label "${label.name}": sublabels names must be unique`);
        }

        if (typeof label.svg !== 'string') {
            throw new Error(`Label "${label.name}": skeletons must provide a correct SVG template`);
        }

        const sublabelIds = label.sublabels
            .map((sublabel: SerializedLabel) => sublabel.id)
            .filter((sublabelId: number | undefined) => sublabelId !== undefined);
        const matches = label.svg.matchAll(/data-label-id=&quot;([\d]+)&quot;/g);
        for (const match of matches) {
            const refersToId = +match[1];
            if (!sublabelIds.includes(refersToId)) {
                throw new Error(
                    `Label "${label.name}": skeletons SVG refers to sublabel with id ${refersToId}, ` +
                    'which is not present in the sublabels array',
                );
            }
        }
    }
}

export function idGenerator(): number {
    return --id;
}

export function equalArrayHead(arr1: string[], arr2: string[]): boolean {
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}

export function toSVGCoord(svg: SVGSVGElement, coord: number[], raiseError = false): number[] {
    const result = [];
    const ctm = svg.getScreenCTM();

    if (!ctm) {
        if (raiseError) throw new Error('Screen CTM is null');
        return coord;
    }

    const inversed = ctm.inverse();
    if (!inversed) {
        if (raiseError) throw new Error('Inversed screen CTM is null');
        return coord;
    }

    for (let i = 0; i < coord.length; i += 2) {
        let point = svg.createSVGPoint();
        point.x = coord[i];
        point.y = coord[i + 1];
        point = point.matrixTransform(inversed);
        result.push(point.x, point.y);
    }

    return result;
}

export function fromSVGCoord(svg: SVGSVGElement, coord: number[], raiseError = false): number[] {
    const result = [];
    const ctm = svg.getScreenCTM();
    if (!ctm) {
        if (raiseError) throw new Error('Inversed screen CTM is null');
        return coord;
    }

    for (let i = 0; i < coord.length; i += 2) {
        let point = svg.createSVGPoint();
        point.x = coord[i];
        point.y = coord[i + 1];
        point = point.matrixTransform(ctm);
        result.push(point.x, point.y);
    }

    return result;
}
