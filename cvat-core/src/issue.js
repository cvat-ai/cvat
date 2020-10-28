// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const Comment = require('./comment');
const User = require('./user');
const { ArgumentError } = require('./exceptions');
const { negativeIDGenerator } = require('./common');
const serverProxy = require('./server-proxy');

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
        if (typeof data.created_date === 'undefined') {
            data.created_date = new Date().toISOString();
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
                 * @name ROI
                 * @type {number[]}
                 * @memberof module:API.cvat.classes.Issue
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                ROI: {
                    get: () => data.roi,
                    set: (value) => {
                        if (Array.isArray(value) || value.some((coord) => typeof coord !== 'number')) {
                            throw new ArgumentError(`Array of numbers is expected. Got ${value}`);
                        }
                        data.roi = value;
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

    async comment(data) {
        const { id } = this;
        if (id >= 0) {
            const response = await serverProxy.issues.comment(id, [data]);
            for (const comment of response) {
                if (comment.owner && !(comment.owner in User.objects)) {
                    const userData = await serverProxy.users.get(comment.owner);
                    new User(userData);
                }
            }
            if (response.owner && !(response.owner in User.objects)) {
                const userData = await serverProxy.users.get(response.owner);
                new User(userData);
            }
            this.__internal.comment_set = response.map((comment) => new Comment(comment));
        } else {
            const comment = new Comment(data);
            this.__internal.comment_set.push(comment);
        }
    }

    async resolve(user) {
        const { id } = this;
        if (id >= 0) {
            const response = await serverProxy.issues.resolve(id);
            if (!(response.resolver in User.objects)) {
                const userData = await serverProxy.users.get(response.resolver);
                new User(userData);
            }
            this.__internal.resolved_date = response.resolved_date;
            this.__internal.resolver = User.objects[response.resolver];
        } else {
            this.__internal.resolved_date = new Date().toISOString();
            this.__internal.resolver = user;
        }
    }

    async reopen() {
        const { id } = this;
        if (id >= 0) {
            const response = await serverProxy.issues.reopen(id);
            if (response.resolver && !(response.resolver in User.objects)) {
                const userData = await serverProxy.users.get(response.resolver);
                new User(userData);
            }
            this.__internal.resolved_date = response.resolved_date;
            this.__internal.resolver = response.resolver;
        } else {
            this.__internal.resolved_date = null;
            this.__internal.resolver = null;
        }
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
            roi: this.ROI,
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
