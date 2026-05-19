// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export const config: Partial<Config> = {
    fields: {
        id: {
            label: 'ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        provider_type: {
            label: 'Provider type',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'AWS_S3_BUCKET', title: 'Amazon S3' },
                    { value: 'AZURE_CONTAINER', title: 'Azure Blob Storage' },
                    { value: 'GOOGLE_CLOUD_STORAGE', title: 'Google Cloud Storage' },
                ],
            },
        },
        credentials_type: {
            label: 'Credentials type',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'KEY_SECRET_KEY_PAIR', title: 'Key & secret key' },
                    { value: 'ACCOUNT_NAME_TOKEN_PAIR', title: 'Account name & token' },
                    { value: 'ANONYMOUS_ACCESS', title: 'Anonymous access' },
                    { value: 'KEY_FILE_PATH', title: 'Key file' },
                ],
            },
        },
        resource: {
            label: 'Resource name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        name: {
            label: 'Name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        description: {
            label: 'Description',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        owner: {
            label: 'Owner',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        updated_date: {
            label: 'Last updated',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedCloudStoragesFilters';

export const predefinedFilterValues = {
    'Owned by me': '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
    'Amazon S3 storages': '{"and":[{"==":[{"var":"provider_type"},"AWS_S3_BUCKET"]}]}',
    'Azure Blob storages': '{"and":[{"==":[{"var":"provider_type"},"AZURE_CONTAINER"]}]}',
    'Google Cloud storages': '{"and":[{"==":[{"var":"provider_type"},"GOOGLE_CLOUD_STORAGE"]}]}',
};
