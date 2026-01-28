// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import User from './user';
import serverProxy from './server-proxy';
import { WebhookSourceType, WebhookContentType } from './enums';
import { isEnum } from './common';
import { ArgumentError } from './exceptions';

interface RawWebhookData {
    id?: number;
    type: WebhookSourceType;
    target_url: string;
    organization_id?: number;
    project_id?: number;
    events: string[];
    content_type: WebhookContentType;
    secret?: string;
    enable_ssl: boolean;
    description?: string;
    is_active?: boolean;
    owner?: any;
    created_date?: string;
    updated_date?: string;
    last_delivery_date?: string;
    last_status?: number;
}

export default class Webhook {
    public readonly id: number;
    public readonly type: WebhookSourceType;
    public readonly organizationID: number | null;
    public readonly projectID: number | null;
    public readonly owner: User;
    public readonly lastStatus: number;
    public readonly lastDeliveryDate?: string;
    public readonly createdDate: string;
    public readonly updatedDate: string;

    public targetURL: string;
    public events: string[];
    public contentType: RawWebhookData['content_type'];
    public description?: string;
    public secret?: string;
    public isActive?: boolean;
    public enableSSL: boolean;

    static async availableEvents(type: WebhookSourceType): Promise<string[]> {
        return serverProxy.webhooks.events(type);
    }

    constructor(initialData: RawWebhookData) {
        const data: RawWebhookData = {
            id: undefined,
            target_url: '',
            type: WebhookSourceType.ORGANIZATION,
            events: [],
            content_type: WebhookContentType.JSON,
            organization_id: null,
            project_id: null,
            description: undefined,
            secret: '',
            is_active: undefined,
            enable_ssl: undefined,
            owner: undefined,
            created_date: undefined,
            updated_date: undefined,
            last_delivery_date: undefined,
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
                        if (typeof value !== 'string') {
                            throw new ArgumentError(
                                `targetURL property must be a string, tried to set ${typeof value}`,
                            );
                        }
                        data.target_url = value;
                    },
                },
                events: {
                    get: () => data.events,
                    set: (events: string[]) => {
                        if (!Array.isArray(events)) {
                            throw new ArgumentError(
                                `Events must be an array, tried to set ${typeof events}`,
                            );
                        }
                        events.forEach((event: string) => {
                            if (typeof event !== 'string') {
                                throw new ArgumentError(
                                    `Event must be a string, tried to set ${typeof event}`,
                                );
                            }
                        });
                        data.events = [...events];
                    },
                },
                contentType: {
                    get: () => data.content_type,
                    set: (value: WebhookContentType) => {
                        if (!isEnum.call(WebhookContentType, value)) {
                            throw new ArgumentError(
                                `Webhook contentType must be member of WebhookContentType,
                                 got wrong value ${typeof value}`,
                            );
                        }
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
                        if (typeof value !== 'string') {
                            throw new ArgumentError(
                                `Description property must be a string, tried to set ${typeof value}`,
                            );
                        }
                        data.description = value;
                    },
                },
                secret: {
                    get: () => data.secret,
                    set: (value: string) => {
                        if (typeof value !== 'string') {
                            throw new ArgumentError(
                                `Secret property must be a string, tried to set ${typeof value}`,
                            );
                        }
                        data.secret = value;
                    },
                },
                isActive: {
                    get: () => data.is_active,
                    set: (value: boolean) => {
                        if (typeof value !== 'boolean') {
                            throw new ArgumentError(
                                `isActive property must be a boolean, tried to set ${typeof value}`,
                            );
                        }
                        data.is_active = value;
                    },
                },
                enableSSL: {
                    get: () => data.enable_ssl,
                    set: (value: boolean) => {
                        if (typeof value !== 'boolean') {
                            throw new ArgumentError(
                                `enableSSL property must be a boolean, tried to set ${typeof value}`,
                            );
                        }
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
                lastDeliveryDate: {
                    get: () => data.last_delivery_date,
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
            type: this.type || WebhookSourceType.ORGANIZATION,
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

interface RawWebhookDeliveryData {
    id?: number;
    event?: string;
    webhook_id?: number;
    status_code?: string;
    redelivery?: boolean;
    created_date?: string;
    updated_date?: string;
}

export class WebhookDelivery {
    public readonly id?: number;
    public readonly event: string;
    public readonly webhookId: number;
    public readonly statusCode: string;
    public readonly createdDate?: string;
    public readonly updatedDate?: string;

    constructor(initialData: RawWebhookDeliveryData) {
        const data: RawWebhookDeliveryData = {
            id: undefined,
            event: '',
            webhook_id: undefined,
            status_code: undefined,
            created_date: undefined,
            updated_date: undefined,
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
                event: {
                    get: () => data.event,
                },
                webhookId: {
                    get: () => data.webhook_id,
                },
                statusCode: {
                    get: () => data.status_code,
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

Object.defineProperties(Webhook.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            if (Number.isInteger(this.id)) {
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
            const result = await serverProxy.webhooks.ping(this.id);
            return new WebhookDelivery(result);
        },
    },
});
