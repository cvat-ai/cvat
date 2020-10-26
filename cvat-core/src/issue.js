// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const Comment = require('./comment');
const User = require('./user');
const { ArgumentError } = require('./exceptions');

/**
 * Class representing a single issue
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
class Issue {
    constructor(initialData) {
        const data = {
            id: undefined,
            roi: undefined,
            comment_set: [],
            frame: undefined,
            created_date: undefined,
            resolved_date: undefined,
            owner: undefined,
            resolver: undefined,
            removed: false,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.comment_set) {
            data.comment_set = data.comment_set.map((comment) => new Comment(comment));
        }

        if (data.owner !== null) {
            data.owner = User.objects[data.owner];
        }

        if (data.resolver !== null) {
            data.resolver = User.objects[data.resolver];
        }

        Object.defineProperties(
            this,
            Object.freeze({
                /**
                 * @name id
                 * @type {integer}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                id: {
                    get: () => data.id,
                },
                /**
                 * Region of interests of the issue
                 * @name roi
                 * @type {number[]}
                 * @memberof module:API.cvat.classes.Issue
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                roi: {
                    get: () => data.message,
                    set: (value) => {
                        if (!value.trim().length) {
                            throw new ArgumentError('Value must not be empty');
                        }
                        data.message = value;
                    },
                },
                /**
                 * List of comments attached to the issue
                 * @name comments
                 * @type {module:API.cvat.classes.Comment[]}
                 * @memberof module:API.cvat.classes.Issue
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                comments: {
                    get: () => data.comment_set.filter((comment) => !comment.removed),
                },
                /**
                 * @name frame
                 * @type {integer}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                frame: {
                    get: () => data.frame,
                },
                /**
                 * @name createdDate
                 * @type {string}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                createdDate: {
                    get: () => data.created_date,
                },
                /**
                 * @name resolvedDate
                 * @type {string}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                resolvedDate: {
                    get: () => data.resolved_date,
                },
                /**
                 * An instance of a user who has raised the issue
                 * @name owner
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                owner: {
                    get: () => data.owner,
                },
                /**
                 * An instance of a user who has resolved the issue
                 * @name resolver
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                resolver: {
                    get: () => data.resolver,
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

    // eslint-disable-next-line
    async comment(message) {
        // add a message to a collection, update in a local storage if issue do not have id
        // if saved on the server, add comment immediately
    }

    async resolve() {
        // server request, update data
    }

    async unresolve() {
        // server request, update data
    }

    async delete() {
        if (typeof this.id !== 'undefined') {
            // TODO: make a server request to delete
        }

        this.removed = true;
    }
}

module.exports = Issue;
