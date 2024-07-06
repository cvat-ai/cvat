// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export enum ProviderType {
    AWS_S3_BUCKET = 'AWS_S3_BUCKET',
    AZURE_CONTAINER = 'AZURE_CONTAINER',
    GOOGLE_CLOUD_STORAGE = 'GOOGLE_CLOUD_STORAGE',
}

export enum CredentialsType {
    KEY_SECRET_KEY_PAIR = 'KEY_SECRET_KEY_PAIR',
    ACCOUNT_NAME_TOKEN_PAIR = 'ACCOUNT_NAME_TOKEN_PAIR',
    ANONYMOUS_ACCESS = 'ANONYMOUS_ACCESS',
    CONNECTION_STRING = 'CONNECTION_STRING',
    KEY_FILE_PATH = 'KEY_FILE_PATH',
}

export enum StorageStatuses {
    AVAILABLE = 'AVAILABLE',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
}

export enum ShortcutScope {
    ALL = 'all',
}
