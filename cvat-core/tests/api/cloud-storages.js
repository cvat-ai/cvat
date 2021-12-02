// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

// Initialize api
window.cvat = require('../../src/api');

const { CloudStorage } = require('../../src/cloud-storage');
const { cloudStoragesDummyData } = require('../mocks/dummy-data.mock');

describe('Feature: get cloud storages', () => {
    test('get all cloud storages', async () => {
        const result = await window.cvat.cloudStorages.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(cloudStoragesDummyData.count);
        for (const item of result) {
            expect(item).toBeInstanceOf(CloudStorage);
        }
    });

    test('get cloud storage by id', async () => {
        const result = await window.cvat.cloudStorages.get({
            id: 1,
        });
        const cloudStorage = result[0];

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(cloudStorage).toBeInstanceOf(CloudStorage);
        expect(cloudStorage.id).toBe(1);
        expect(cloudStorage.providerType).toBe('AWS_S3_BUCKET');
        expect(cloudStorage.credentialsType).toBe('KEY_SECRET_KEY_PAIR');
        expect(cloudStorage.resourceName).toBe('bucket');
        expect(cloudStorage.displayName).toBe('Demonstration bucket');
        expect(cloudStorage.manifests).toHaveLength(1);
        expect(cloudStorage.manifests[0]).toBe('manifest.jsonl');
        expect(cloudStorage.specificAttributes).toBe('');
        expect(cloudStorage.description).toBe('It is first bucket');
    });

    test('get a cloud storage by an unknown id', async () => {
        const result = await window.cvat.cloudStorages.get({
            id: 10,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get a cloud storage by an invalid id', async () => {
        expect(
            window.cvat.cloudStorages.get({
                id: '1',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('get cloud storages by filters', async () => {
        const filters = [
            new Map([
                ['providerType', 'AWS_S3_BUCKET'],
                ['resourceName', 'bucket'],
                ['displayName', 'Demonstration bucket'],
                ['credentialsType', 'KEY_SECRET_KEY_PAIR'],
                ['description', 'It is first bucket'],
            ]),
            new Map([
                ['providerType', 'AZURE_CONTAINER'],
                ['resourceName', 'container'],
                ['displayName', 'Demonstration container'],
                ['credentialsType', 'ACCOUNT_NAME_TOKEN_PAIR'],
            ]),
            new Map([
                ['providerType', 'GOOGLE_CLOUD_STORAGE'],
                ['resourceName', 'gcsbucket'],
                ['displayName', 'Demo GCS'],
                ['credentialsType', 'KEY_FILE_PATH'],
            ]),
        ];

        const ids = [1, 2, 3];

        await Promise.all(filters.map(async (_, idx) => {
            const result = await window.cvat.cloudStorages.get(Object.fromEntries(filters[idx]));
            const [cloudStorage] = result;
            expect(Array.isArray(result)).toBeTruthy();
            expect(result).toHaveLength(1);
            expect(cloudStorage).toBeInstanceOf(CloudStorage);
            expect(cloudStorage.id).toBe(ids[idx]);
            filters[idx].forEach((value, key) => {
                expect(cloudStorage[key]).toBe(value);
            });
        }));
    });

    test('get cloud storage by invalid filters', async () => {
        expect(
            window.cvat.cloudStorages.get({
                unknown: '5',
            }),
        ).rejects.toThrow(window.cvat.exceptions.ArgumentError);
    });
});

describe('Feature: create a cloud storage', () => {
    test('create new cloud storage without an id', async () => {
        const cloudStorage = new window.cvat.classes.CloudStorage({
            display_name: 'new cloud storage',
            provider_type: 'AZURE_CONTAINER',
            resource: 'newcontainer',
            credentials_type: 'ACCOUNT_NAME_TOKEN_PAIR',
            account_name: 'accountname',
            session_token: 'x'.repeat(135),
            manifests: ['manifest.jsonl'],
        });

        const result = await cloudStorage.save();
        expect(typeof result.id).toBe('number');
    });
});

describe('Feature: update a cloud storage', () => {
    test('update cloud storage with some new field values', async () => {
        const newValues = new Map([
            ['displayName', 'new display name'],
            ['credentialsType', 'ANONYMOUS_ACCESS'],
            ['description', 'new description'],
            ['specificAttributes', 'region=eu-west-1'],
        ]);

        let result = await window.cvat.cloudStorages.get({
            id: 1,
        });

        let [cloudStorage] = result;

        for (const [key, value] of newValues) {
            cloudStorage[key] = value;
        }

        cloudStorage.save();

        result = await window.cvat.cloudStorages.get({
            id: 1,
        });
        [cloudStorage] = result;

        newValues.forEach((value, key) => {
            expect(cloudStorage[key]).toBe(value);
        });
    });

    test('Update manifests in a cloud storage', async () => {
        const newManifests = [
            'sub1/manifest.jsonl',
            'sub2/manifest.jsonl',
        ];

        let result = await window.cvat.cloudStorages.get({
            id: 1,
        });
        let [cloudStorage] = result;

        cloudStorage.manifests = newManifests;
        cloudStorage.save();

        result = await window.cvat.cloudStorages.get({
            id: 1,
        });
        [cloudStorage] = result;

        expect(cloudStorage.manifests).toEqual(newManifests);
    });
});

describe('Feature: delete a cloud storage', () => {
    test('delete a cloud storage', async () => {
        let result = await window.cvat.cloudStorages.get({
            id: 2,
        });

        await result[0].delete();
        result = await window.cvat.cloudStorages.get({
            id: 2,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });
});
