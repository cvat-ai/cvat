// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum SelectionSchema {
    EMAIL_ADDRESS = 'email_address',
    LOWEST_WEIGHT = 'lowest_weight',
}
interface SocialAuthMethodCamelCase {
    provider: string;
    publicName: string;
    isEnabled: boolean;
    icon: string;
    selectionSchema?: SelectionSchema;
}

interface SocialAuthMethodSnakeCase {
    public_name: string;
    is_enabled: boolean;
    icon: string;
    provider?: string;
    selection_schema?: SelectionSchema;
}

export class SocialAuthMethod {
    public provider: string;
    public publicName: string;
    public isEnabled: boolean;
    public icon: string;
    public selectionSchema: SelectionSchema;

    constructor(initialData: SocialAuthMethodSnakeCase) {
        const data: SocialAuthMethodCamelCase = {
            provider: initialData.provider,
            publicName: initialData.public_name,
            isEnabled: initialData.is_enabled,
            icon: initialData.icon,
            selectionSchema: initialData.selection_schema,
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
                selectionSchema: {
                    get: () => data.selectionSchema,
                },
            }),
        );
    }
}

export type SocialAuthMethodsRawType = {
    [index: string]: SocialAuthMethodSnakeCase;
};

export type SocialAuthMethods = SocialAuthMethod[];
