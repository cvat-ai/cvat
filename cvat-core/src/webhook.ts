// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import User from './user';

const serverProxy = require('./server-proxy');

interface RawWebhookData {
    id?: number;
    type: 'project' | 'organization';
    target_url: string;
    organization_id?: number;
    project_id?: number;
    events: string[];
    content_type: 'application/json';
    secret?: string;
    enable_ssl: boolean;
    description?: string;
    is_active?: boolean;
    owner?: any;
    created_date?: string;
    updated_date?: string;
    last_delivery?: undefined;
    last_status?: number;
}

export default class Webhook {
    public readonly id?: number;
    public readonly type: RawWebhookData['type'];
    public readonly organizationID?: number;
    public readonly projectID?: number;
    public readonly owner?: User;
    public readonly createdDate?: string;
    public readonly updatedDate?: string;

    public targetURL: string;
    public events: string[];
    public contentType: RawWebhookData['content_type'];
    public description?: string;
    public secret?: string;
    public isActive?: boolean;
    public enableSSL: boolean;

    static async events(): Promise<string[]> {
        return serverProxy.webhooks.events();
    }

    constructor(initialData: RawWebhookData) {
        const data: RawWebhookData = {
            id: undefined,
            target_url: '',
            type: 'organization',
            events: [],
            content_type: 'application/json',
            organization_id: undefined,
            project_id: undefined,
            description: undefined,
            secret: '',
            is_active: undefined,
            enable_ssl: undefined,
            owner: undefined,
            created_date: undefined,
            updated_date: undefined,
            last_delivery: undefined,
            last_status: 0,
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
                type: {
                    get: () => data.type,
                },
                targetURL: {
                    get: () => data.target_url,
                    set: (value: string) => {
                        // todo: make validation
                        data.target_url = value;
                    },
                },
                events: {
                    get: () => data.events,
                    set: (events: string[]) => {
                        // todo: make validation
                        data.events = [...events];
                    },
                },
                contentType: {
                    get: () => data.content_type,
                    set: (value: RawWebhookData['content_type']) => {
                        // todo: make validation
                        data.content_type = value;
                    },
                },
                organizationID: {
                    get: () => data.organization_id,
                },
                projectID: {
                    get: () => data.project_id,
                },
                description: {
                    get: () => data.description,
                    set: (value: string) => {
                        // todo: make validation
                        data.description = value;
                    },
                },
                secret: {
                    get: () => data.secret,
                    set: (value: string) => {
                        // todo: make validation
                        data.secret = value;
                    },
                },
                isActive: {
                    get: () => data.is_active,
                    set: (value: boolean) => {
                        // todo: make validation
                        data.is_active = value;
                    },
                },
                enableSSL: {
                    get: () => data.enable_ssl,
                    set: (value: boolean) => {
                        // todo: make validation
                        data.enable_ssl = value;
                    },
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
                lastDelivery: {
                    get: () => data.last_delivery,
                },
                lastStatus: {
                    get: () => data.last_status,
                },
            }),
        );
    }

    public toJSON(): RawWebhookData {
        const result: RawWebhookData = {
            target_url: this.targetURL,
            events: [...this.events],
            content_type: this.contentType,
            enable_ssl: this.enableSSL,
            type: this.type || 'organization', // TODO: Fix hardcoding
        };

        if (Number.isInteger(this.id)) {
            result.id = this.id;
        }

        if (Number.isInteger(this.organizationID)) {
            result.organization_id = this.organizationID;
        }

        if (Number.isInteger(this.projectID)) {
            result.project_id = this.projectID;
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

        return result;
    }

    public async save(): Promise<Webhook> {
        const result = await PluginRegistry.apiWrapper.call(this, Webhook.prototype.save);
        return result;
    }

    public async delete(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Webhook.prototype.delete);
        return result;
    }

    public async ping(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Webhook.prototype.ping);
        return result;
    }
}

Object.defineProperties(Webhook.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (Number.isInteger(this.id)) {
                const body = this.toJSON();
                const supportedUpdateFields = ['description', 'targetURL', 'secret', 'contentType', 'isActive', 'enableSSL', 'events'];
                for (const key in body) {
                    if (!supportedUpdateFields.includes(key)) {
                        delete body[key];
                    }
                }
                const result = await serverProxy.webhooks.update(this.id, this.toJSON());
                return new Webhook(result);
            }

            const result = await serverProxy.webhooks.create(this.toJSON());
            return new Webhook(result);
        },
    },
});

Object.defineProperties(Webhook.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (Number.isInteger(this.id)) {
                await serverProxy.webhooks.delete(this.id);
            }
        },
    },
});

Object.defineProperties(Webhook.prototype.ping, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (Number.isInteger(this.id)) {
                await serverProxy.webhooks.ping(this.id);
            } else {
                throw new Error('The webhook has not been saved on the server yet');
            }
        },
    },
});
