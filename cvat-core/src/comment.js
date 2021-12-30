// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const User = require('./user');
const { ArgumentError } = require('./exceptions');

/**
 * Class representing a single comment
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
class Comment {
    constructor(initialData) {
        const data = {
            id: undefined,
            message: undefined,
            created_date: undefined,
            updated_date: undefined,
            owner: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.owner && !(data.owner instanceof User)) data.owner = new User(data.owner);
        if (typeof data.created_date === 'undefined') {
            data.created_date = new Date().toISOString();
        }

        Object.defineProperties(
            this,
            Object.freeze({
                /**
                 * @name id
                 * @type {integer}
                 * @memberof module:API.cvat.classes.Comment
                 * @readonly
                 * @instance
                 */
                id: {
                    get: () => data.id,
                },
                /**
                 * @name message
                 * @type {string}
                 * @memberof module:API.cvat.classes.Comment
                 * @instance
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                message: {
                    get: () => data.message,
                    set: (value) => {
                        if (!value.trim().length) {
                            throw new ArgumentError('Value must not be empty');
                        }
                        data.message = value;
                    },
                },
                /**
                 * @name createdDate
                 * @type {string}
                 * @memberof module:API.cvat.classes.Comment
                 * @readonly
                 * @instance
                 */
                createdDate: {
                    get: () => data.created_date,
                },
                /**
                 * @name updatedDate
                 * @type {string}
                 * @memberof module:API.cvat.classes.Comment
                 * @readonly
                 * @instance
                 */
                updatedDate: {
                    get: () => data.updated_date,
                },
                /**
                 * Instance of a user who has created the comment
                 * @name owner
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Comment
                 * @readonly
                 * @instance
                 */
                owner: {
                    get: () => data.owner,
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    serialize() {
        const data = {
            message: this.message,
        };

        if (typeof this.id === 'number') {
            data.id = this.id;
        }
        if (this.createdDate) {
            data.created_date = this.createdDate;
        }
        if (this.updatedDate) {
            data.updated_date = this.updatedDate;
        }
        if (this.owner) {
            data.owner_id = this.owner.serialize().id;
        }

        return data;
    }
}

module.exports = Comment;
