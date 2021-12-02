// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const quickhull = require('quickhull');

const PluginRegistry = require('./plugins');
const Comment = require('./comment');
const User = require('./user');
const { ArgumentError } = require('./exceptions');
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
            job: undefined,
            position: undefined,
            comments: [],
            frame: undefined,
            created_date: undefined,
            owner: undefined,
            resolved: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.owner && !(data.owner instanceof User)) data.owner = new User(data.owner);

        if (data.comments) {
            data.comments = data.comments.map((comment) => new Comment(comment));
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
                 * @name position
                 * @type {number[]}
                 * @memberof module:API.cvat.classes.Issue
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                position: {
                    get: () => data.position,
                    set: (value) => {
                        if (Array.isArray(value) || value.some((coord) => typeof coord !== 'number')) {
                            throw new ArgumentError(`Array of numbers is expected. Got ${value}`);
                        }
                        data.position = value;
                    },
                },
                /**
                 * ID of a job, the issue is linked with
                 * @name job
                 * @type {number}
                 * @memberof module:API.cvat.classes.Issue
                 * @instance
                 * @readonly
                 * @throws {module:API.cvat.exceptions.ArgumentError}
                 */
                job: {
                    get: () => data.job,
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
                    get: () => [...data.comments],
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
                 * The flag defines issue status
                 * @name resolved
                 * @type {module:API.cvat.classes.User}
                 * @memberof module:API.cvat.classes.Issue
                 * @readonly
                 * @instance
                 */
                resolved: {
                    get: () => data.resolved,
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    static hull(coordinates) {
        if (coordinates.length > 4) {
            const points = coordinates.reduce((acc, coord, index, arr) => {
                if (index % 2) acc.push({ x: arr[index - 1], y: coord });
                return acc;
            }, []);

            return quickhull(points)
                .map((point) => [point.x, point.y])
                .flat();
        }

        return coordinates;
    }

    /**
     * @typedef {Object} CommentData
     * @property {string} message a comment message
     * @global
     */
    /**
     * Method appends a comment to the issue
     * For a new issue it saves comment locally, for a saved issue it saves comment on the server
     * @method comment
     * @memberof module:API.cvat.classes.Issue
     * @param {CommentData} data
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ServerError}
     * @throws {module:API.cvat.exceptions.PluginError}
     * @throws {module:API.cvat.exceptions.ArgumentError}
     */
    async comment(data) {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.comment, data);
        return result;
    }

    /**
     * The method resolves the issue
     * New issues are resolved locally, server-saved issues are resolved on the server
     * @method resolve
     * @memberof module:API.cvat.classes.Issue
     * @param {module:API.cvat.classes.User} user
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ServerError}
     * @throws {module:API.cvat.exceptions.PluginError}
     * @throws {module:API.cvat.exceptions.ArgumentError}
     */
    async resolve(user) {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.resolve, user);
        return result;
    }

    /**
     * The method resolves the issue
     * New issues are reopened locally, server-saved issues are reopened on the server
     * @method reopen
     * @memberof module:API.cvat.classes.Issue
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ServerError}
     * @throws {module:API.cvat.exceptions.PluginError}
     * @throws {module:API.cvat.exceptions.ArgumentError}
     */
    async reopen() {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.reopen);
        return result;
    }

    /**
     * The method deletes the issue
     * Deletes local or server-saved issues
     * @method delete
     * @memberof module:API.cvat.classes.Issue
     * @readonly
     * @instance
     * @async
     * @throws {module:API.cvat.exceptions.ServerError}
     * @throws {module:API.cvat.exceptions.PluginError}
     */
    async delete() {
        await PluginRegistry.apiWrapper.call(this, Issue.prototype.delete);
    }

    serialize() {
        const { comments } = this;
        const data = {
            position: this.position,
            frame: this.frame,
            comments: comments.map((comment) => comment.serialize()),
        };

        if (typeof this.id === 'number') {
            data.id = this.id;
        }
        if (typeof this.job === 'number') {
            data.job = this.job;
        }
        if (typeof this.createdDate === 'string') {
            data.created_date = this.createdDate;
        }
        if (typeof this.resolved === 'boolean') {
            data.resolved = this.resolved;
        }
        if (this.owner instanceof User) {
            data.owner = this.owner.serialize().id;
        }

        return data;
    }
}

Issue.prototype.comment.implementation = async function (data) {
    if (typeof data !== 'object' || data === null) {
        throw new ArgumentError(`The argument "data" must be an object. Got "${data}"`);
    }
    if (typeof data.message !== 'string' || data.message.length < 1) {
        throw new ArgumentError(`Comment message must be a not empty string. Got "${data.message}"`);
    }

    const comment = new Comment(data);
    if (typeof this.id === 'number') {
        const serialized = comment.serialize();
        serialized.issue = this.id;
        const response = await serverProxy.comments.create(serialized);
        const savedComment = new Comment(response);
        this.__internal.comments.push(savedComment);
    } else {
        this.__internal.comments.push(comment);
    }
};

Issue.prototype.resolve.implementation = async function (user) {
    if (!(user instanceof User)) {
        throw new ArgumentError(`The argument "user" must be an instance of a User class. Got "${typeof user}"`);
    }

    if (typeof this.id === 'number') {
        const response = await serverProxy.issues.update(this.id, { resolved: true });
        this.__internal.resolved = response.resolved;
    } else {
        this.__internal.resolved = true;
    }
};

Issue.prototype.reopen.implementation = async function () {
    if (typeof this.id === 'number') {
        const response = await serverProxy.issues.update(this.id, { resolved: false });
        this.__internal.resolved = response.resolved;
    } else {
        this.__internal.resolved = false;
    }
};

Issue.prototype.delete.implementation = async function () {
    const { id } = this;
    if (id >= 0) {
        await serverProxy.issues.delete(id);
    }
};

module.exports = Issue;
