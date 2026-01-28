// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import quickhull from 'quickhull';

import PluginRegistry from './plugins';
import Comment, { RawCommentData } from './comment';
import User from './user';
import { ArgumentError } from './exceptions';
import serverProxy from './server-proxy';

interface RawIssueData {
    job: number;
    position: number[];
    frame: number;
    id?: number;
    comments?: RawCommentData[];
    owner?: any;
    resolved?: boolean;
    created_date?: string;
}

export default class Issue {
    public readonly id?: number;
    public readonly job: number;
    public readonly frame: number;
    public readonly owner?: User;
    public readonly comments: Comment[];
    public readonly resolved?: boolean;
    public readonly createdDate?: string;
    public position?: number[];
    private readonly __internal: RawIssueData & { comments: Comment[] };

    constructor(initialData: RawIssueData) {
        const data: RawIssueData & { comments: Comment[] } = {
            id: undefined,
            job: undefined,
            position: undefined,
            frame: undefined,
            created_date: undefined,
            owner: undefined,
            resolved: undefined,
            comments: undefined,
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

        if (Array.isArray(initialData.comments)) {
            data.comments = initialData.comments.map((comment: RawCommentData): Comment => new Comment(comment));
        } else {
            data.comments = [];
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                position: {
                    get: () => data.position,
                    set: (value) => {
                        if (Array.isArray(value) || value.some((coord) => typeof coord !== 'number')) {
                            throw new ArgumentError(`Array of numbers is expected. Got ${value}`);
                        }
                        data.position = value;
                    },
                },
                job: {
                    get: () => data.job,
                },
                comments: {
                    get: () => data.comments,
                },
                frame: {
                    get: () => data.frame,
                },
                createdDate: {
                    get: () => data.created_date,
                },
                owner: {
                    get: () => data.owner,
                },
                resolved: {
                    get: () => data.resolved,
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    public static hull(coordinates: number[]): number[] {
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

    // Method appends a comment to the issue
    // For a new issue it saves comment locally, for a saved issue it saves comment on the server
    public async comment(data: RawCommentData): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.comment, data);
        return result;
    }

    // The method resolves the issue
    // New issues are resolved locally, server-saved issues are resolved on the server
    public async resolve(user: User): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.resolve, user);
        return result;
    }

    // The method reopens the issue
    // New issues are reopened locally, server-saved issues are reopened on the server
    public async reopen(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Issue.prototype.reopen);
        return result;
    }

    // The method deletes the issue
    // Deletes local or server-saved issues
    public async delete(): Promise<void> {
        await PluginRegistry.apiWrapper.call(this, Issue.prototype.delete);
    }

    public serialize(): RawIssueData {
        const data: RawIssueData = {
            job: this.job,
            position: this.position,
            frame: this.frame,
        };

        if (typeof this.id === 'number') {
            data.id = this.id;
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

Object.defineProperties(Issue.prototype.comment, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(this: Issue, data: RawCommentData) {
            if (typeof data !== 'object' || data === null) {
                throw new ArgumentError(`The argument "data" must be an object. Got "${data}"`);
            }
            if (typeof data.message !== 'string' || data.message.length < 1) {
                throw new ArgumentError(`Comment message must be a not empty string. Got "${data.message}"`);
            }

            const internalData = Object.getOwnPropertyDescriptor(this, '__internal').get();
            const comment = new Comment(data);
            if (typeof this.id === 'number') {
                const serialized = comment.serialize();
                serialized.issue = this.id;
                const response = await serverProxy.comments.create(serialized);
                const savedComment = new Comment(response);
                internalData.comments.push(savedComment);
            } else {
                internalData.comments.push(comment);
            }
        },
    },
});

Object.defineProperties(Issue.prototype.resolve, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(user: User) {
            if (!(user instanceof User)) {
                throw new ArgumentError(`The argument "user" must be an
                                         instance of a User class. Got "${typeof user}"`);
            }

            if (typeof this.id === 'number') {
                const response = await serverProxy.issues.update(this.id, { resolved: true });
                this.__internal.resolved = response.resolved;
            } else {
                this.__internal.resolved = true;
            }
        },
    },
});

Object.defineProperties(Issue.prototype.reopen, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (typeof this.id === 'number') {
                const response = await serverProxy.issues.update(this.id, { resolved: false });
                this.__internal.resolved = response.resolved;
            } else {
                this.__internal.resolved = false;
            }
        },
    },
});

Object.defineProperties(Issue.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            const { id } = this;
            if (id >= 0) {
                await serverProxy.issues.delete(id);
            }
        },
    },
});
