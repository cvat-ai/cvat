// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const User = require('./user');
    const serverProxy = require('./server-proxy');
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
                    throw new ArgumentError(`Unsupported filter property has been recieved: "${prop}"`);
                } else if (!fields[prop](filter[prop])) {
                    throw new ArgumentError(`Received filter property "${prop}" is not satisfied for checker`);
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
                        `"${name}" is expected to be ${instance.name}, but `
                            + `"${value.constructor.name}" has been got`,
                    );
                }

                throw new ArgumentError(`"${name}" is expected to be ${instance.name}, but "undefined" has been got.`);
            }
        }

        return true;
    }

    function collectNecessaryUsers(instance) {
        const necessaryUsers = new Set();

        if (Array.isArray(instance)) {
            for (const oneInstance of instance) {
                collectNecessaryUsers(oneInstance).forEach((id) => necessaryUsers.add(id));
            }
        } else if (typeof instance === 'object' && instance !== null) {
            for (const key of Object.keys(instance)) {
                if (typeof instance[key] === 'object') {
                    collectNecessaryUsers(instance[key]).forEach((id) => necessaryUsers.add(id));
                } else if (
                    ['owner', 'assignee', 'resolver', 'reviewer'].includes(key)
                    && Number.isInteger(instance[key])
                ) {
                    necessaryUsers.add(instance[key]);
                }
            }
        }

        return Array.from(necessaryUsers);
    }

    async function fetchUsersLazy(necessaryUsers) {
        let needFetch = false;
        for (const user of necessaryUsers) {
            if (!(user in User.objects)) {
                needFetch = true;
                break;
            }
        }

        if (needFetch) {
            const users = await serverProxy.users.get();
            users.map((user) => new User(user));
        }
    }

    module.exports = {
        isBoolean,
        isInteger,
        isEnum,
        isString,
        checkFilter,
        checkObjectType,
        fetchUsersLazy,
        collectNecessaryUsers,
    };
})();
