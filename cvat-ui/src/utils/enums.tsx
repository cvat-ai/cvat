// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export enum ProviderType {
    AWS_S3_BUCKET = 'AWS_S3_BUCKET',
    AZURE_CONTAINER = 'AZURE_CONTAINER',
}

export enum CredentialsType {
    TEMP_KEY_SECRET_KEY_TOKEN_SET = 'TEMP_KEY_SECRET_KEY_TOKEN_SET',
    ACCOUNT_NAME_TOKEN_PAIR = 'ACCOUNT_NAME_TOKEN_PAIR',
    ANONYMOUS_ACCESS = 'ANONYMOUS_ACCESS',
}

export interface TempKeySecreyKeyTokenSet {
    keyId: string | null;
    secretKey: string | null;
    sessionToken: string | null;
}

export interface AccountNameTokenPair {
    accountName: string | null;
    sasToken: string | null;
}
