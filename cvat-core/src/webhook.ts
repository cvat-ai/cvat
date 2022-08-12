// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import User from './user';

const serverProxy = require('./server-proxy');

interface WebhookEvent {
    id?: number;
    name: string;
    description: string;
}

interface RawWebhookData {
    id?: number;
    target_url: string;
    events: WebhookEvent[];
    content_type: 'application/json';
    secret?: string;
    enable_ssl: boolean;
    description?: string;
    is_active?: boolean;
    owner?: any;
    created_date?: string;
    updated_date?: string;
}

export default class Webhook {
    public readonly id?: number;
    public readonly targetURL: string;
    public readonly events: WebhookEvent[];
    public readonly contentType: 'application/json';
    public readonly description?: string;
    public readonly secret?: string;
    public readonly isActive?: boolean;
    public readonly enableSSL: boolean;
    public readonly owner?: User;
    public readonly createdDate?: string;
    public readonly updatedDate?: string;

    constructor(initialData: RawWebhookData) {
        const data: RawWebhookData = {
            id: undefined,
            target_url: '',
            events: [],
            content_type: 'application/json',
            description: undefined,
            secret: '',
            is_active: undefined,
            enable_ssl: undefined,
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
                targetURL: {
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

    public toJSON(): RawWebhookData {
        const result: RawWebhookData = {
            target_url: this.targetURL,
            events: this.events.map((event: WebhookEvent) => ({ ...event })),
            content_type: this.contentType,
            enable_ssl: this.enableSSL,
        };

        if (Number.isInteger(this.id)) {
            result.id = this.id;
        }

        if (this.description) {
            result.description = this.description;
        }

        if (this.secret) {
            result.secret = this.secret;
        }

        if (typeof this.isActive === 'boolean') {
            result.is_active = this.isActive;
        }

        if (this.owner instanceof User) {
            result.owner = this.owner.serialize();
        }

        if (this.createdDate) {
            result.created_date = this.createdDate;
        }

        if (this.updatedDate) {
            result.updated_date = this.updatedDate;
        }

        return result;
    }

    public async save(): Promise<Webhook> {
        if (Number.isInteger(this.id)) {
            // TODO: call patch request
            return this;
        }

        // TODO: call save request
        return this;
    }

    public async delete(): Promise<void> {

    }
}

module.exports = Webhook;
