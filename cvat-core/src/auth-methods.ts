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
                provider: {
                    get: () => data.provider,
                },
                publicName: {
                    get: () => data.publicName,
                },
                isEnabled: {
                    get: () => data.isEnabled,
                },
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
