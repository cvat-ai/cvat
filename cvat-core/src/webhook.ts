// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
     * Class representing a webhook
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
class Webhook {
    constructor(initialData) {
        const data = {
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
        // TODO: causes strange error, need to invistigate
        // if (data.owner) data.owner = new User(data.owner);

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
                enableSsl: {
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
