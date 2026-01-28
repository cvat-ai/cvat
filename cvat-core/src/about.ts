// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAbout } from './server-response-types';

export default class AboutData {
    #description: string;
    #name: string;
    #version: string;
    #logoURL: string;
    #subtitle: string;

    constructor(initialData: SerializedAbout) {
        this.#description = initialData.description;
        this.#name = initialData.name;
        this.#version = initialData.version;
        this.#logoURL = initialData.logo_url;
        this.#subtitle = initialData.subtitle;
    }

    get description(): string {
        return this.#description;
    }

    get name(): string {
        return this.#name;
    }

    get version(): string {
        return this.#version;
    }

    get logoURL(): string {
        return this.#logoURL;
    }

    get subtitle(): string {
        return this.#subtitle;
    }
}
