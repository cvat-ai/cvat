// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import User from './user';

interface RawWebhookData {
    id?: number;
    target_url: string;
    events: string[];
    content_type: 'application/json';
    secret: string;
    enable_ssl: boolean;
    description?: string;
    is_active?: boolean;
    owner?: any;
    created_date?: string;
    updated_date?: string;
}

export default class Webhook {
    public readonly id?: number;
    public readonly targetUrl: string;
    public readonly events: string[];
    public readonly contentType: 'application/json';
    public readonly description?: string;
    public readonly secret: string;
    public readonly isActive?: boolean;
    public readonly enableSSL: boolean;
    public readonly owner?: User;
    public readonly createdDate?: string;
    public readonly updatedDate?: string;

    constructor(initialData: RawWebhookData) {
        const data: RawWebhookData = {
            id: null,
            target_url: null,
            events: null,
            content_type: null,
            description: null,
            secret: null,
            is_active: null,
            enable_ssl: null,
            owner: undefined,
            created_date: undefined,
            updated_date: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.owner) {
            data.owner = new User(data.owner);
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                targetUrl: {
                    get: () => data.target_url,
                },
                events: {
                    get: () => data.events,
                },
                contentType: {
                    get: () => data.content_type,
                },
                description: {
                    get: () => data.description,
                },
                secret: {
                    get: () => data.secret,
                },
                isActive: {
                    get: () => data.is_active,
                },
                enableSSL: {
                    get: () => data.enable_ssl,
                },
                owner: {
                    get: () => data.owner,
                },
                createdDate: {
                    get: () => data.created_date,
                },
                updatedDate: {
                    get: () => data.updated_date,
                },
            }),
        );
    }
}

module.exports = Webhook;
