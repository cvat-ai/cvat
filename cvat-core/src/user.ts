// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedUser } from './server-response-types';

export default class User {
    public readonly id: number;
    public readonly username: string;
    public readonly email: string;
    public readonly firstName: string;
    public readonly lastName: string;
    public readonly groups: ('user' | 'business' | 'admin')[];
    public readonly lastLogin: string;
    public readonly dateJoined: string;
    public readonly isStaff: boolean;
    public readonly isSuperuser: boolean;
    public readonly isActive: boolean;
    public readonly isVerified: boolean;

    constructor(initialData: SerializedUser) {
        const data = {
            id: null,
            username: null,
            email: null,
            first_name: null,
            last_name: null,
            groups: null,
            last_login: null,
            date_joined: null,
            is_staff: null,
            is_superuser: null,
            is_active: null,
            email_verification_required: null,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                username: {
                    get: () => data.username,
                },
                email: {
                    get: () => data.email,
                },
                firstName: {
                    get: () => data.first_name,
                },
                lastName: {
                    get: () => data.last_name,
                },
                groups: {
                    get: () => JSON.parse(JSON.stringify(data.groups)),
                },
                lastLogin: {
                    get: () => data.last_login,
                },
                dateJoined: {
                    get: () => data.date_joined,
                },
                isStaff: {
                    get: () => data.is_staff,
                },
                isSuperuser: {
                    get: () => data.is_superuser,
                },
                isActive: {
                    get: () => data.is_active,
                },
                isVerified: {
                    get: () => !data.email_verification_required,
                },
            }),
        );
    }

    serialize(): Partial<SerializedUser> {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            first_name: this.firstName,
            last_name: this.lastName,
            groups: this.groups,
            last_login: this.lastLogin,
            date_joined: this.dateJoined,
            is_staff: this.isStaff,
            is_superuser: this.isSuperuser,
            is_active: this.isActive,
            email_verification_required: this.isVerified,
        };
    }
}
