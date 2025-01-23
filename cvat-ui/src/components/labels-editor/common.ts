// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedLabel, SerializedAttribute } from 'cvat-core-wrapper';

export interface SkeletonConfiguration {
    type: 'skeleton';
    svg: string;
    sublabels: SerializedLabel[];
}

export type LabelOptColor = SerializedLabel;

let id = 0;

function validateParsedAttribute(attr: SerializedAttribute): void {
    if (typeof attr.name !== 'string') {
        throw new Error(`Type of attribute name must be a string. Got value ${attr.name}`);
    }

    if (!['number', 'undefined'].includes(typeof attr.id)) {
        throw new Error(
            `Attribute: "${attr.name}". Type of attribute id must be a number or undefined. Got value ${attr.id}`,
        );
    }

    if (!['checkbox', 'number', 'text', 'radio', 'select'].includes((attr.input_type || '').toLowerCase())) {
        throw new Error(`Attribute: "${attr.name}". Unknown input type: ${attr.input_type}`);
    }

    if (typeof attr.mutable !== 'boolean') {
        throw new Error(`Attribute: "${attr.name}". Mutable flag must be a boolean value. Got value ${attr.mutable}`);
    }

    if (!Array.isArray(attr.values)) {
        throw new Error(`Attribute: "${attr.name}". Attribute values must be an array. Got type ${typeof attr.values}`);
    }

    if (!attr.values.length) {
        throw new Error(`Attribute: "${attr.name}". Attribute values array mustn't be empty`);
    }

    for (const value of attr.values) {
        if (typeof value !== 'string') {
            throw new Error(`Attribute: "${attr.name}". Each value must be a string. Got value ${value}`);
        }
    }
}

export function validateParsedLabel(label: SerializedLabel): void {
    if (typeof label.name !== 'string') {
        throw new Error(`Type of label name must be a string. Got value ${label.name}`);
    }

    if (!['number', 'undefined'].includes(typeof label.id)) {
        throw new Error(
            `Label "${label.name}". Type of label id must be only a number or undefined. Got value ${label.id}`,
        );
    }

    if (label.color && typeof label.color !== 'string') {
        throw new Error(`Label "${label.name}". Label color must be a string. Got ${typeof label.color}`);
    }

    if (label.color && !label.color.match(/^#[0-9a-fA-F]{6}$|^$/)) {
        throw new Error(
            `Label "${label.name}". ` +
                `Type of label color must be only a valid color string. Got value ${label.color}`,
        );
    }

    if (!Array.isArray(label.attributes)) {
        throw new Error(`Label "${label.name}". Attributes must be an array. Got type ${typeof label.attributes}`);
    }

    for (const attr of label.attributes) {
        validateParsedAttribute(attr);
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
