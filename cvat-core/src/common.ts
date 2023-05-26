// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023s CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ArgumentError } from './exceptions';

export function isBoolean(value): boolean {
    return typeof value === 'boolean';
}

export function isInteger(value): boolean {
    return typeof value === 'number' && Number.isInteger(value);
}

export function isEmail(value): boolean {
    return typeof value === 'string' && RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(value);
}

// Called with specific Enum context
export function isEnum(value): boolean {
    for (const key in this) {
        if (Object.prototype.hasOwnProperty.call(this, key)) {
            if (this[key] === value) {
                return true;
            }
        }
    }

    return false;
}

export function isString(value): boolean {
    return typeof value === 'string';
}

export function checkFilter(filter, fields): void {
    for (const prop in filter) {
        if (Object.prototype.hasOwnProperty.call(filter, prop)) {
            if (!(prop in fields)) {
                throw new ArgumentError(`Unsupported filter property has been received: "${prop}"`);
            } else if (!fields[prop](filter[prop])) {
                throw new ArgumentError(`Received filter property "${prop}" does not satisfy API`);
            }
        }
    }
}

export function checkExclusiveFields(obj, exclusive, ignore): void {
    const fields = {
        exclusive: [],
        other: [],
    };
    for (const field in obj) {
        if (!(ignore.includes(field))) {
            if (exclusive.includes(field)) {
                if (fields.other.length || fields.exclusive.length) {
                    throw new ArgumentError(`Do not use the filter field "${field}" with others`);
                }
                fields.exclusive.push(field);
            } else {
                fields.other.push(field);
            }
        }
    }
}

export function checkObjectType(name, value, type, instance?): boolean {
    if (type) {
        if (typeof value !== type) {
            // specific case for integers which aren't native type in JS
            if (type === 'integer' && Number.isInteger(value)) {
                return true;
            }

            throw new ArgumentError(`"${name}" is expected to be "${type}", but "${typeof value}" has been got.`);
        }
    } else if (instance) {
        if (!(value instanceof instance)) {
            if (value !== undefined) {
                throw new ArgumentError(
                    `"${name}" is expected to be ${instance.name}, but ` +
                        `"${value.constructor.name}" has been got`,
                );
            }

            throw new ArgumentError(`"${name}" is expected to be ${instance.name}, but "undefined" has been got.`);
        }
    }

    return true;
}

export class FieldUpdateTrigger {
    #updatedFlags: Record<string, boolean> = {};

    reset(): void {
        this.#updatedFlags = {};
    }

    update(name: string): void {
        this.#updatedFlags[name] = true;
    }

    getUpdated(data: object, propMap: Record<string, string> = {}): Record<string, unknown> {
        const result = {};
        for (const updatedField of Object.keys(this.#updatedFlags)) {
            result[propMap[updatedField] || updatedField] = data[updatedField];
        }
        return result;
    }
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
