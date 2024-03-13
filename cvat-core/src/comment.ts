// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import User from './user';
import { ArgumentError } from './exceptions';

export interface RawCommentData {
    id?: number;
    message?: string;
    created_date?: string;
    updated_date?: string;
    owner?: any;
}

interface SerializedCommentData extends RawCommentData {
    owner_id?: number;
    issue?: number;
}

export default class Comment {
    public readonly id: number;
    public readonly createdDate: string;
    public readonly updatedDate: string;
    public readonly owner: User;
    public message: string;

    constructor(initialData: RawCommentData) {
        const data: RawCommentData = {
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
                id: {
                    get: () => data.id,
                },
                message: {
                    get: () => data.message,
                    set: (value) => {
                        if (!value.trim().length) {
                            throw new ArgumentError('Value must not be empty');
                        }
                        data.message = value;
                    },
                },
                createdDate: {
                    get: () => data.created_date,
                },
                updatedDate: {
                    get: () => data.updated_date,
                },
                owner: {
                    get: () => data.owner,
                },
                __internal: {
                    get: () => data,
                },
            }),
        );
    }

    public serialize(): SerializedCommentData {
        const data: SerializedCommentData = {
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
