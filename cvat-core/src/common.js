/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const { ArgumentError } = require('./exceptions');

    function isBoolean(value) {
        return typeof (value) === 'boolean';
    }

    function isInteger(value) {
        return typeof (value) === 'number' && Number.isInteger(value);
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
        return typeof (value) === 'string';
    }

    function checkFilter(filter, fields) {
        for (const prop in filter) {
            if (Object.prototype.hasOwnProperty.call(filter, prop)) {
                if (!(prop in fields)) {
                    throw new ArgumentError(
                        `Unsupported filter property has been recieved: "${prop}"`,
                    );
                } else if (!fields[prop](filter[prop])) {
                    throw new ArgumentError(
                        `Received filter property "${prop}" is not satisfied for checker`,
                    );
                }
            }
        }
    }

    function checkObjectType(name, value, type, instance) {
        if (type) {
            if (typeof (value) !== type) {
                // specific case for integers which aren't native type in JS
                if (type === 'integer' && Number.isInteger(value)) {
                    return true;
                }

                throw new ArgumentError(
                    `"${name}" is expected to be "${type}", but "${typeof (value)}" has been got.`,
                );
            }
        } else if (instance) {
            if (!(value instanceof instance)) {
                if (value !== undefined) {
                    throw new ArgumentError(
                        `"${name}" is expected to be ${instance.name}, but `
                            + `"${value.constructor.name}" has been got`,
                    );
                }

                throw new ArgumentError(
                    `"${name}" is expected to be ${instance.name}, but "undefined" has been got.`,
                );
            }
        }

        return true;
    }

    function funhash(s) {
        let h = 0xdeadbeef;
        for (let i = 0; i < s.length; i++) {
            // eslint-disable-next-line no-bitwise
            h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
        }
        // eslint-disable-next-line no-bitwise
        return (h ^ h >>> 16) >>> 0;
    }

    module.exports = {
        isBoolean,
        isInteger,
        isEnum,
        isString,
        checkFilter,
        checkObjectType,
        funhash,
    };
})();
