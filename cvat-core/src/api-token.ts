// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedApiTokenData } from './server-response-types';

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

    constructor(initialData: SerializedApiTokenData) {
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
}
