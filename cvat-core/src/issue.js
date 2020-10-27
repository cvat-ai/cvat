// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const Comment = require('./comment');
const User = require('./user');
const { ArgumentError } = require('./exceptions');
const { negativeIDGenerator } = require('./common');

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

        if (typeof data.id === 'undefined') {
            data.id = negativeIDGenerator();
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
        // const comment = new Comment({ message });
        // save on the server if positive id
        // append saved comment to the collection
        // else just push to comment set
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

    toJSON() {
        const { comments } = this;
        const data = {
            roi: this.roi,
            frame: this.frame,
            comment_set: comments,
        };

        if (this.id > 0) {
            data.id = this.id;
        }
        if (this.createdDate) {
            data.created_date = this.createdDate;
        }
        if (this.resolvedDate) {
            data.resolved_date = this.resolvedDate;
        }
        if (this.owner) {
            data.owner = this.owner.id;
        }
        if (this.resolver) {
            data.resolver = this.resolver.id;
        }

        return data;
    }
}

module.exports = Issue;
