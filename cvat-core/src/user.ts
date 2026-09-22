// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedUser } from './server-response-types';
import { UserModifiableFields } from './server-request-types';
import PluginRegistry from './plugins';
import { fieldsToSnakeCase } from './common';
import serverProxy from './server-proxy';

export default class User {
    public readonly id: number;
    public readonly username: string;
    public readonly email: string;
    public readonly firstName: string;
    public readonly lastName: string;
    public readonly groups: ('user' | 'admin')[];
    public readonly lastLogin: string;
    public readonly dateJoined: string;
    public readonly isStaff: boolean;
    public readonly isSuperuser: boolean;
    public readonly isActive: boolean;
    public readonly isVerified: boolean;
    public readonly hasAnalyticsAccess: boolean;
    public readonly cvatUsageReason: string | null;
    public readonly primaryRole: string | null;
    public readonly plannedActivities: string[];
    public readonly dataTypes: string[];
    public readonly discoverySource: string | null;

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
            has_analytics_access: null,
            cvat_usage_reason: null,
            primary_role: null,
            planned_activities: [] as string[],
            data_types: [] as string[],
            discovery_source: null,
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
                hasAnalyticsAccess: {
                    get: () => data.has_analytics_access,
                },
                cvatUsageReason: {
                    get: () => data.cvat_usage_reason,
                },
                primaryRole: {
                    get: () => data.primary_role,
                },
                plannedActivities: {
                    get: () => [...data.planned_activities],
                },
                dataTypes: {
                    get: () => [...data.data_types],
                },
                discoverySource: {
                    get: () => data.discovery_source,
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
            has_analytics_access: this.hasAnalyticsAccess,
            cvat_usage_reason: this.cvatUsageReason,
            primary_role: this.primaryRole,
            planned_activities: this.plannedActivities,
            data_types: this.dataTypes,
            discovery_source: this.discoverySource,
        };
    }

    public async save(fields: UserModifiableFields = {}): Promise<User> {
        const result = await PluginRegistry.apiWrapper.call(this, User.prototype.save, fields);
        return result;
    }
}

Object.defineProperties(User.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof User.prototype.save>[0],
        ): Promise<User> {
            const data = fieldsToSnakeCase(fields);

            const result = await serverProxy.users.update(this.id, data);
            return new User(result);
        },
    },
});
