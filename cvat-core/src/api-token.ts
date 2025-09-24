// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { SerializedApiToken } from './server-response-types';
import { APIApiTokenModifiableFields, ApiTokenModifiableFields } from './server-request-types';
import { fieldsToSnakeCase } from './common';

export default class ApiToken {
    #id: number;
    #name: string;
    #createdDate: string;
    #updatedDate: string;
    #expiryDate: string | null;
    #lastUsedDate: string | null;
    #readOnly: boolean;
    #owner: number;
    #value?: string;

    constructor(initialData: Partial<SerializedApiToken>) {
        this.#id = initialData.id;
        this.#name = initialData.name;
        this.#createdDate = initialData.created_date;
        this.#updatedDate = initialData.updated_date;
        this.#expiryDate = initialData.expiry_date;
        this.#lastUsedDate = initialData.last_used_date;
        this.#readOnly = initialData.read_only;
        this.#owner = initialData.owner;
        this.#value = initialData.value;
    }

    get id(): number {
        return this.#id;
    }

    get name(): string {
        return this.#name;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get updatedDate(): string {
        return this.#updatedDate;
    }

    get expiryDate(): string | null {
        return this.#expiryDate;
    }

    get lastUsedDate(): string | null {
        return this.#lastUsedDate;
    }

    get readOnly(): boolean {
        return this.#readOnly;
    }

    get owner(): number {
        return this.#owner;
    }

    get value(): string | undefined {
        return this.#value;
    }

    get isExpired(): boolean {
        if (!this.#expiryDate) {
            return false;
        }
        return new Date(this.#expiryDate) < new Date();
    }

    get isNew(): boolean {
        return this.#value !== undefined;
    }

    public async save(fields: ApiTokenModifiableFields = {}): Promise<ApiToken> {
        const result = await PluginRegistry.apiWrapper.call(this, ApiToken.prototype.save, fields);
        return result;
    }

    public toJSON(): SerializedApiToken {
        const result: Partial<SerializedApiToken> = {
            name: this.#name,
            read_only: this.#readOnly,
            owner: this.#owner,
        };

        if (Number.isInteger(this.#id)) {
            result.id = this.#id;
        }

        if (this.#createdDate) {
            result.created_date = this.#createdDate;
        }

        if (this.#updatedDate) {
            result.updated_date = this.#updatedDate;
        }

        if (this.#expiryDate) {
            result.expiry_date = this.#expiryDate;
        }

        if (this.#lastUsedDate) {
            result.last_used_date = this.#lastUsedDate;
        }

        if (this.#value !== undefined) {
            result.value = this.#value;
        }

        return result as SerializedApiToken;
    }
}

Object.defineProperties(ApiToken.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(fields: Parameters<typeof ApiToken.prototype.save>[0]) {
            const data: APIApiTokenModifiableFields = fieldsToSnakeCase(fields);

            if (Number.isInteger(this.id)) {
                const result = await serverProxy.apiTokens.update(this.id, data);
                return new ApiToken(result);
            }

            const result = await serverProxy.apiTokens.create(this.toJSON());
            return new ApiToken(result);
        },
    },
});
