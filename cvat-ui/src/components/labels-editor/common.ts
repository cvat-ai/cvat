// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface Attribute {
    id: number;
    name: string;
    input_type: string;
    mutable: boolean;
    values: string[];
}

export interface Label {
    name: string;
    id: number;
    attributes: Attribute[];
}

let id = 0;

function validateParsedAttribute(attr: Attribute): void {
    if (typeof (attr.name) !== 'string') {
        throw new Error(`Type of attribute name must be a string. Got value ${attr.name}`);
    }

    if (!['number', 'undefined'].includes(typeof (attr.id))) {
        throw new Error(`Attribute: "${attr.name}". `
        + `Type of attribute id must be a number or undefined. Got value ${attr.id}`);
    }

    if (!['checkbox', 'number', 'text', 'radio', 'select'].includes((attr.input_type || '').toLowerCase())) {
        throw new Error(`Attribute: "${attr.name}". `
        + `Unknown input type: ${attr.input_type}`);
    }

    if (typeof (attr.mutable) !== 'boolean') {
        throw new Error(`Attribute: "${attr.name}". `
        + `Mutable flag must be a boolean value. Got value ${attr.mutable}`);
    }

    if (!Array.isArray(attr.values)) {
        throw new Error(`Attribute: "${attr.name}". `
        + `Attribute values must be an array. Got type ${typeof (attr.values)}`);
    }

    for (const value of attr.values) {
        if (typeof (value) !== 'string') {
            throw new Error(`Attribute: "${attr.name}". `
            + `Each value must be a string. Got value ${value}`);
        }
    }
}

export function validateParsedLabel(label: Label): void {
    if (typeof (label.name) !== 'string') {
        throw new Error(`Type of label name must be a string. Got value ${label.name}`);
    }

    if (!['number', 'undefined'].includes(typeof (label.id))) {
        throw new Error(`Label "${label.name}". `
        + `Type of label id must be only a number or undefined. Got value ${label.id}`);
    }

    if (!Array.isArray(label.attributes)) {
        throw new Error(`Label "${label.name}". `
        + `attributes must be an array. Got type ${typeof (label.attributes)}`);
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
