// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const dummyGoogleStorage = {
    count: 1,
    next: null,
    previous: null,
    results: [
        {
            id: 3,
            owner: {
                url: 'http://localhost:7000/api/users/1',
                id: 1,
                username: 'maya',
                first_name: '',
                last_name: '',
            },
            manifests: [
                'manifest.jsonl',
            ],
            provider_type: 'GOOGLE_CLOUD_STORAGE',
            resource: 'gcsbucket',
            display_name: 'Demo GCS',
            created_date: '2021-09-01T09:29:47.094244Z',
            updated_date: '2021-09-01T09:29:47.103264Z',
            credentials_type: 'KEY_FILE_PATH',
            specific_attributes: '',
            description: 'It is first google cloud storage',
        },
    ],
};

const dummyAzureContainer = {
    count: 1,
    next: null,
    previous: null,
    results: [
        {
            id: 2,
            owner: {
                url: 'http://localhost:7000/api/users/1',
                id: 1,
                username: 'maya',
                first_name: '',
                last_name: '',
            },
            manifests: [
                'manifest.jsonl',
            ],
            provider_type: 'AZURE_CONTAINER',
            resource: 'container',
            display_name: 'Demonstration container',
            created_date: '2021-09-01T09:29:47.094244Z',
            updated_date: '2021-09-01T09:29:47.103264Z',
            credentials_type: 'ACCOUNT_NAME_TOKEN_PAIR',
            specific_attributes: '',
            description: 'It is first container',
        },
    ],
};

const dummyAWSBucket = {
    count: 1,
    next: null,
    previous: null,
    results: [
        {
            id: 1,
            owner: {
                url: 'http://localhost:7000/api/users/1',
                id: 1,
                username: 'maya',
                first_name: '',
                last_name: '',
            },
            manifests: [
                'manifest.jsonl',
            ],
            provider_type: 'AWS_S3_BUCKET',
            resource: 'bucket',
            display_name: 'Demonstration bucket',
            created_date: '2021-08-31T09:03:09.350817Z',
            updated_date: '2021-08-31T15:16:21.394773Z',
            credentials_type: 'KEY_SECRET_KEY_PAIR',
            specific_attributes: '',
            description: 'It is first bucket',
        },
    ],
};

module.exports = {
    dummyGoogleStorage,
    dummyAzureContainer,
    dummyAWSBucket,
};
