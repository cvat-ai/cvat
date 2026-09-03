// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import User from './user';
import { fieldsToSnakeCase } from './common';
import { SerializedUserGrowthData } from './server-response-types';
import {
    APIUserGrowthDataModifiableFields,
    UserGrowthDataModifiableFields,
} from './server-request-types';

export default class UserGrowthData {
    #id: number;
    #owner: User;
    #githubPromptShown: boolean;
    #githubPromptSupportClicked: boolean;
    #githubPromptEnabled: boolean;
    #promotionNotificationsAllowed: boolean;

    constructor(initialData: SerializedUserGrowthData) {
        this.#id = initialData.id;
        this.#owner = new User(initialData.owner);
        this.#githubPromptShown = initialData.github_prompt_shown;
        this.#githubPromptSupportClicked = initialData.github_prompt_support_clicked;
        this.#githubPromptEnabled = initialData.github_prompt_enabled;
        this.#promotionNotificationsAllowed = initialData.promotion_notifications_allowed;
    }

    get id(): number {
        return this.#id;
    }

    get owner(): User {
        return this.#owner;
    }

    get githubPromptShown(): boolean {
        return this.#githubPromptShown;
    }

    get githubPromptSupportClicked(): boolean {
        return this.#githubPromptSupportClicked;
    }

    get githubPromptEnabled(): boolean {
        return this.#githubPromptEnabled;
    }

    get promotionNotificationsAllowed(): boolean {
        return this.#promotionNotificationsAllowed;
    }

    public async save(fields: UserGrowthDataModifiableFields = {}): Promise<UserGrowthData> {
        const result = await PluginRegistry.apiWrapper.call(this, UserGrowthData.prototype.save, fields);
        return result;
    }
}

Object.defineProperties(UserGrowthData.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof UserGrowthData.prototype.save>[0],
        ): Promise<UserGrowthData> {
            const data: APIUserGrowthDataModifiableFields = fieldsToSnakeCase(fields);
            const result = await serverProxy.growth.update(this.id, data);
            return new UserGrowthData(result);
        },
    },
});
