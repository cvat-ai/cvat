// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface SocialAuthMethodCamelCase {
    provider: string;
    publicName: string;
    isEnabled: boolean;
    icon: string;
}

interface SocialAuthMethodSnakeCase {
    public_name: string;
    is_enabled: boolean;
    icon: string;
    provider?: string;
}

export class SocialAuthMethod {
    public provider: string;
    public publicName: string;
    public isEnabled: boolean;
    public icon: string;

    constructor(initialData: SocialAuthMethodSnakeCase) {
        const data: SocialAuthMethodCamelCase = {
            provider: initialData.provider,
            publicName: initialData.public_name,
            isEnabled: initialData.is_enabled,
            icon: initialData.icon,
        };

        Object.defineProperties(
            this,
            Object.freeze({
                /**
                 * @name provider
                 * @type {string}
                 * @memberof module:API.cvat.classes.SocialAuthMethod
                 * @instance
                 * @readonly
                 */
                provider: {
                    get: () => data.provider,
                },
                /**
                 * @name publicName
                 * @type {string}
                 * @memberof module:API.cvat.classes.SocialAuthMethod
                 * @instance
                 * @readonly
                 */
                publicName: {
                    get: () => data.publicName,
                },
                /**
                 * @name isEnabled
                 * @type {boolean}
                 * @memberof module:API.cvat.classes.SocialAuthMethod
                 * @instance
                 * @readonly
                 */
                isEnabled: {
                    get: () => data.isEnabled,
                },
                /**
                 * @name icon
                 * @type {string}
                 * @memberof module:API.cvat.classes.SocialAuthMethod
                 * @instance
                 * @readonly
                 */
                icon: {
                    get: () => data.icon,
                },
            }),
        );
    }
}

export type SocialAuthMethodsRawType = {
    [index: string]: SocialAuthMethodSnakeCase;
};

export type SocialAuthMethods = SocialAuthMethod[];
