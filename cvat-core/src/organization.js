// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const { checkObjectType } = require('./common');
const { ArgumentError } = require('./exceptions');
const PluginRegistry = require('./plugins');
const serverProxy = require('./server-proxy');
const User = require('./user');

/**
 * Class representing an organization
 * @memberof module:API.cvat.classes
 */
class Organization {
    /**
     * @param {object} initialData - Object which is used for initialization
     * <br> It must contains keys:
     * <br> <li style="margin-left: 10px;"> slug

     * <br> It can contains keys:
     * <br> <li style="margin-left: 10px;"> name
     * <br> <li style="margin-left: 10px;"> company
     * <br> <li style="margin-left: 10px;"> email
     * <br> <li style="margin-left: 10px;"> location
     */
    constructor(initialData) {
        const data = {
            id: undefined,
            slug: undefined,
            name: undefined,
            description: undefined,
            created_date: undefined,
            updated_date: undefined,
            company: undefined,
            email: undefined,
            location: undefined,
            owner: undefined,
        };

        for (const prop of Object.keys(data)) {
            if (prop in initialData) {
                data[prop] = initialData[prop];
            }
        }

        if (data.owner) data.owner = new User(data.owner);

        checkObjectType('slug', data.slug, 'string');
        if (typeof data.name !== 'undefined') {
            checkObjectType('name', data.name, 'string');
        }

        if (typeof data.description !== 'undefined') {
            checkObjectType('description', data.description, 'string');
        }

        if (typeof data.id !== 'undefined') {
            checkObjectType('id', data.id, 'number');
        }

        if (typeof data.company !== 'undefined') {
            checkObjectType('company', data.company, 'string');
        }

        if (typeof data.email !== 'undefined') {
            checkObjectType('email', data.email, 'string');
        }

        if (typeof data.location !== 'undefined') {
            checkObjectType('location', data.location, 'string');
        }

        if (typeof data.owner !== 'undefined') {
            checkObjectType('owner', data.owner, null, User);
        }

        Object.defineProperties(this, {
            id: {
                get: () => data.id,
            },
            slug: {
                get: () => data.slug,
            },
            name: {
                get: () => data.name,
                set: (name) => {
                    if (typeof name !== 'string') {
                        throw ArgumentError(`Name property must be a string, tried to set ${typeof description}`);
                    }
                    data.name = name;
                },
            },
            description: {
                get: () => data.description,
                set: (description) => {
                    if (typeof description !== 'string') {
                        throw ArgumentError(
                            `Description property must be a string, tried to set ${typeof description}`,
                        );
                    }
                    data.description = description;
                },
            },
            company: {
                get: () => data.company,
                set: (company) => {
                    if (typeof company !== 'string') {
                        throw ArgumentError(`Company property must be a string, tried to set ${typeof company}`);
                    }
                    data.company = company;
                },
            },
            email: {
                get: () => data.email,
                set: (email) => {
                    if (typeof email !== 'string') {
                        throw ArgumentError(`Email property must be a string, tried to set ${typeof email}`);
                    }
                    data.email = email;
                },
            },
            location: {
                get: () => data.location,
                set: (location) => {
                    if (typeof location !== 'string') {
                        throw ArgumentError(`Location property must be a string, tried to set ${typeof location}`);
                    }
                    data.location = location;
                },
            },
            owner: {
                get: () => data.owner,
            },
            createdDate: {
                get: () => data.created_date,
            },
            updatedDate: {
                get: () => data.updated_date,
            },
        });
    }

    /**
     * Method updates organization data if it was created before, or creates a new organization
     * @method save
     * @returns {module:API.cvat.classes.Organization}
     * @memberof module:API.cvat.classes.Organization
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ServerError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async save() {
        const result = await PluginRegistry.apiWrapper.call(this, Organization.prototype.save);
        return result;
    }
}

Organization.prototype.save.implementation = async function () {
    if (this.id !== null) {
        // TODO: patch data
        return this;
    }

    const organizationData = {
        slug: this.slug,
        name: this.name || this.slug,
        description: this.description,
    };

    const result = await serverProxy.organizations.create(organizationData);
    return new Organization(result);
};

module.exports = Organization;

// TODO: add select organization method and fix issues in cvat-proxy
// TODO: add patch method, actions and reducers
