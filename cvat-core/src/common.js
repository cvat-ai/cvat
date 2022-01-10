// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const { ArgumentError } = require('./exceptions');

    function isBoolean(value) {
        return typeof value === 'boolean';
    }

    function isInteger(value) {
        return typeof value === 'number' && Number.isInteger(value);
    }

    // Called with specific Enum context
    function isEnum(value) {
        for (const key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key)) {
                if (this[key] === value) {
                    return true;
                }
            }
        }

        return false;
    }

    function isString(value) {
        return typeof value === 'string';
    }

    function checkFilter(filter, fields) {
        for (const prop in filter) {
            if (Object.prototype.hasOwnProperty.call(filter, prop)) {
                if (!(prop in fields)) {
                    throw new ArgumentError(`Unsupported filter property has been received: "${prop}"`);
                } else if (!fields[prop](filter[prop])) {
                    throw new ArgumentError(`Received filter property "${prop}" is not satisfied for checker`);
                }
            }
        }
    }

    function checkExclusiveFields(obj, exclusive, ignore) {
        const fields = {
            exclusive: [],
            other: [],
        };
        for (const field in Object.keys(obj)) {
            if (!(field in ignore)) {
                if (field in exclusive) {
                    if (fields.other.length) {
                        throw new ArgumentError(`Do not use the filter field "${field}" with others`);
                    }
                    fields.exclusive.push(field);
                } else {
                    fields.other.push(field);
                }
            }
        }
    }

    function checkObjectType(name, value, type, instance) {
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

    function camelToSnake(str) {
        if (typeof str !== 'string') {
            throw new ArgumentError('str is expected to be string');
        }

        return (
            str[0].toLowerCase() + str.slice(1, str.length).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        );
    }

    class FieldUpdateTrigger {
        constructor() {
            let updatedFlags = {};

            Object.defineProperties(
                this,
                Object.freeze({
                    reset: {
                        value: () => {
                            updatedFlags = {};
                        },
                    },
                    update: {
                        value: (name) => {
                            updatedFlags[name] = true;
                        },
                    },
                    getUpdated: {
                        value: (data, propMap = {}) => {
                            const result = {};
                            for (const updatedField of Object.keys(updatedFlags)) {
                                result[propMap[updatedField] || updatedField] = data[updatedField];
                            }
                            return result;
                        },
                    },
                }),
            );
        }
    }

    module.exports = {
        isBoolean,
        isInteger,
        isEnum,
        isString,
        checkFilter,
        checkObjectType,
        checkExclusiveFields,
        camelToSnake,
        FieldUpdateTrigger,
    };
})();
