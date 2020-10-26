// Copyright (C) 2020 Intel Corporation
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
            removed: false,
            owner: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.owner !== null) {
            data.owner = User.objects[data.owner];
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
                 * @type {module:API.cvat.classes.Comment}
                 * @memberof module:API.cvat.classes.Comment
                 * @readonly
                 * @instance
                 */
                owner: {
                    get: () => data.owner,
                },
                /**
                 * @name removed
                 * @type {module:API.cvat.classes.Comment}
                 * @memberof module:API.cvat.classes.Comment
                 * @instance
                 */
                removed: {
                    get: () => data.removed,
                    set: (value) => {
                        if (typeof value !== 'boolean') {
                            throw new ArgumentError('Value must be a boolean value');
                        }
                        data.removed = value;
                    },
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    async save() {
        // save after changing a message
    }

    async delete() {
        if (typeof this.id !== 'undefined') {
            // TODO: make a server request to delete
        }

        this.removed = true;
    }
}

module.exports = Comment;
