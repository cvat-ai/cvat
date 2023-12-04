// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    return {
        __esModule: true,
        default: require('../mocks/server-proxy.mock'),
    };
});

const cvat = require('../../src/api').default;
const CloudStorage= require('../../src/cloud-storage').default;
const { cloudStoragesDummyData } = require('../mocks/dummy-data.mock.cjs');

describe('Feature: get cloud storages', () => {
    test('get all cloud storages', async () => {
        const result = await cvat.cloudStorages.get();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(cloudStoragesDummyData.count);
        for (const item of result) {
            expect(item).toBeInstanceOf(CloudStorage);
        }
    });

    test('get cloud storage by id', async () => {
        const result = await cvat.cloudStorages.get({
            id: 1,
        });
        const cloudStorage = result[0];

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(1);
        expect(cloudStorage).toBeInstanceOf(CloudStorage);
        expect(cloudStorage.id).toBe(1);
        expect(cloudStorage.providerType).toBe('AWS_S3_BUCKET');
        expect(cloudStorage.credentialsType).toBe('KEY_SECRET_KEY_PAIR');
        expect(cloudStorage.resource).toBe('bucket');
        expect(cloudStorage.displayName).toBe('Demonstration bucket');
        expect(cloudStorage.manifests).toHaveLength(1);
        expect(cloudStorage.manifests[0]).toBe('manifest.jsonl');
        expect(cloudStorage.specificAttributes).toBe('');
        expect(cloudStorage.description).toBe('It is first bucket');
    });

    test('get a cloud storage by an unknown id', async () => {
        const result = await cvat.cloudStorages.get({
            id: 10,
        });
        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    test('get a cloud storage by an invalid id', async () => {
        expect(
            cvat.cloudStorages.get({
                id: '1',
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });

    test('get cloud storages by filters', async () => {
        const filter = {
            and: [
                { '==': [{ var: 'display_name' }, 'Demonstration bucket'] },
                { '==': [{ var: 'resource_name' }, 'bucket'] },
                { '==': [{ var: 'description' }, 'It is first bucket'] },
                { '==': [{ var: 'provider_type' }, 'AWS_S3_BUCKET'] },
                { '==': [{ var: 'credentials_type' }, 'KEY_SECRET_KEY_PAIR'] },
            ],
        };

        const result = await cvat.cloudStorages.get({ filter: JSON.stringify(filter) });
        expect(result).toBeInstanceOf(Array);
    });

    test('get cloud storage by invalid filters', async () => {
        expect(
            cvat.cloudStorages.get({
                unknown: '5',
            }),
        ).rejects.toThrow(cvat.exceptions.ArgumentError);
    });
});

describe('Feature: create a cloud storage', () => {
    test('create new cloud storage without an id', async () => {
        const cloudStorage = new cvat.classes.CloudStorage({
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

        let result = await cvat.cloudStorages.get({
            id: 1,
        });

        let [cloudStorage] = result;

        for (const [key, value] of newValues) {
            cloudStorage[key] = value;
        }

        cloudStorage.save();

        result = await cvat.cloudStorages.get({
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

        let result = await cvat.cloudStorages.get({
            id: 1,
        });
        let [cloudStorage] = result;

        cloudStorage.manifests = newManifests;
        cloudStorage.save();

        result = await cvat.cloudStorages.get({
            id: 1,
        });
        [cloudStorage] = result;

        expect(cloudStorage.manifests).toEqual(newManifests);
    });
});

describe('Feature: delete a cloud storage', () => {
    test('delete a cloud storage', async () => {
        let result = await cvat.cloudStorages.get({
            id: 2,
        });

        await result[0].delete();
        result = await cvat.cloudStorages.get({
            id: 2,
        });

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });
});
