// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { ArgumentError } from './exceptions';
import { CloudStorageCredentialsType, CloudStorageProviderType, CloudStorageStatus } from './enums';
import User from './user';
import { decodePreview } from './frames';
import { SerializedRemoteFile, SerializedCloudStorage } from './server-response-types';

function validateNotEmptyString(value: string): void {
    if (typeof value !== 'string') {
        throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
    } else if (!value.trim().length) {
        throw new ArgumentError('Value mustn\'t be empty string');
    }
}

export default class CloudStorage {
    public readonly id: number;
    public displayName: string;
    public description: string;
    public accountName: string;
    public accessKey: string;
    public secretKey: string;
    public token: string;
    public keyFile: File;
    public connectionString: string;
    public resource: string;
    public manifestPath: string;
    public provider_type: CloudStorageProviderType;
    public credentials_type: CloudStorageCredentialsType;
    public specificAttributes: string;
    public manifests: string[];
    public readonly owner: User;
    public readonly createdDate: string;
    public readonly updatedDate: string;
    public readonly prefix: string | null;

    constructor(initialData: SerializedCloudStorage) {
        const data: SerializedCloudStorage = {
            id: undefined,
            display_name: undefined,
            description: undefined,
            credentials_type: undefined,
            provider_type: undefined,
            resource: undefined,
            account_name: undefined,
            key: undefined,
            secret_key: undefined,
            session_token: undefined,
            key_file: undefined,
            connection_string: undefined,
            specific_attributes: undefined,
            owner: undefined,
            created_date: undefined,
            updated_date: undefined,
            manifest_path: undefined,
            manifests: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                displayName: {
                    get: () => data.display_name,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.display_name = value;
                    },
                },
                description: {
                    get: () => data.description,
                    set: (value) => {
                        if (typeof value !== 'string') {
                            throw new ArgumentError('Value must be string');
                        }
                        data.description = value;
                    },
                },
                accountName: {
                    get: () => data.account_name,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.account_name = value;
                    },
                },
                accessKey: {
                    get: () => data.key,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.key = value;
                    },
                },
                secretKey: {
                    get: () => data.secret_key,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.secret_key = value;
                    },
                },
                token: {
                    get: () => data.session_token,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.session_token = value;
                    },
                },
                keyFile: {
                    get: () => data.key_file,
                    set: (file) => {
                        if (file instanceof File) {
                            data.key_file = file;
                        } else {
                            throw new ArgumentError(`Should be a file. ${typeof file} was found`);
                        }
                    },
                },
                connectionString: {
                    get: () => data.connection_string,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.connection_string = value;
                    },
                },
                resource: {
                    get: () => data.resource,
                    set: (value) => {
                        validateNotEmptyString(value);
                        data.resource = value;
                    },
                },
                manifestPath: {
                    get: () => data.manifest_path,
                    set: (value) => {
                        data.manifest_path = value;
                    },
                },
                providerType: {
                    get: () => data.provider_type,
                    set: (key) => {
                        if (key !== undefined && !!CloudStorageProviderType[key]) {
                            data.provider_type = CloudStorageProviderType[key];
                        } else {
                            throw new ArgumentError('Value must be one CloudStorageProviderType keys');
                        }
                    },
                },
                credentialsType: {
                    get: () => data.credentials_type,
                    set: (key) => {
                        if (key !== undefined && !!CloudStorageCredentialsType[key]) {
                            data.credentials_type = CloudStorageCredentialsType[key];
                        } else {
                            throw new ArgumentError('Value must be one CloudStorageCredentialsType keys');
                        }
                    },
                },
                specificAttributes: {
                    get: () => data.specific_attributes,
                    set: (attributesValue) => {
                        if (typeof attributesValue === 'string') {
                            const attrValues = new URLSearchParams(
                                Array.from(new URLSearchParams(attributesValue).entries()).filter(
                                    ([key, value]) => !!key && !!value,
                                ),
                            ).toString();
                            if (!attrValues) {
                                throw new ArgumentError('Value must match the key1=value1&key2=value2');
                            }
                            data.specific_attributes = attributesValue;
                        } else {
                            throw new ArgumentError('Value must be a string');
                        }
                    },
                },
                owner: {
                    get: () => data.owner,
                },
                createdDate: {
                    get: () => data.created_date,
                },
                updatedDate: {
                    get: () => data.updated_date,
                },
                manifests: {
                    get: () => data.manifests,
                    set: (manifests) => {
                        if (Array.isArray(manifests)) {
                            for (const elem of manifests) {
                                if (typeof elem !== 'string') {
                                    throw new ArgumentError('Each element of the manifests array must be a string');
                                }
                            }
                            data.manifests = manifests;
                        } else {
                            throw new ArgumentError('Value must be an array');
                        }
                    },
                },
                prefix: {
                    get: () => new URLSearchParams(this.specificAttributes).get('prefix'),
                },
            }),
        );
    }

    // Method updates data of a created cloud storage or creates new cloud storage
    public async save(): Promise<CloudStorage> {
        const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.save);
        return result;
    }

    public async delete(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.delete);
        return result;
    }

    public async getContent(path: string, nextToken?: string): Promise<{
        next: string | null,
        content: (Omit<SerializedRemoteFile, 'mime_type'> & { mimeType: string })[],
    }> {
        const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.getContent, path, nextToken);
        return result;
    }

    public async preview(): Promise<string | ArrayBuffer> {
        const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.preview);
        return result;
    }

    public async getStatus(): Promise<CloudStorageStatus> {
        const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.getStatus);
        return result;
    }
}

Object.defineProperties(CloudStorage.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<CloudStorage> {
            function prepareOptionalFields(cloudStorageInstance: CloudStorage): SerializedCloudStorage {
                const data: SerializedCloudStorage = {};
                if (cloudStorageInstance.description !== undefined) {
                    data.description = cloudStorageInstance.description;
                }

                if (cloudStorageInstance.accountName) {
                    data.account_name = cloudStorageInstance.accountName;
                }

                if (cloudStorageInstance.accessKey) {
                    data.key = cloudStorageInstance.accessKey;
                }

                if (cloudStorageInstance.secretKey) {
                    data.secret_key = cloudStorageInstance.secretKey;
                }

                if (cloudStorageInstance.token) {
                    data.session_token = cloudStorageInstance.token;
                }

                if (cloudStorageInstance.keyFile) {
                    data.key_file = cloudStorageInstance.keyFile;
                }

                if (cloudStorageInstance.connectionString) {
                    data.connection_string = cloudStorageInstance.connectionString;
                }

                if (cloudStorageInstance.specificAttributes !== undefined) {
                    data.specific_attributes = cloudStorageInstance.specificAttributes;
                }
                return data;
            }
            // update
            if (typeof this.id !== 'undefined') {
                // provider_type and recource should not change;
                // send to the server only the values that have changed
                const initialData: SerializedCloudStorage = {};
                if (this.displayName) {
                    initialData.display_name = this.displayName;
                }
                if (this.credentialsType) {
                    initialData.credentials_type = this.credentialsType;
                }

                if (this.manifests) {
                    initialData.manifests = this.manifests;
                }

                const cloudStorageData = {
                    ...initialData,
                    ...prepareOptionalFields(this),
                };

                await serverProxy.cloudStorages.update(this.id, cloudStorageData);
                return this;
            }

            // create
            const initialData: SerializedCloudStorage = {
                display_name: this.displayName,
                credentials_type: this.credentialsType,
                provider_type: this.providerType,
                resource: this.resource,
                manifests: this.manifests,
            };

            const cloudStorageData = {
                ...initialData,
                ...prepareOptionalFields(this),
            };

            const cloudStorage = await serverProxy.cloudStorages.create(cloudStorageData);
            return new CloudStorage(cloudStorage);
        },
    },
});

Object.defineProperties(CloudStorage.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<void> {
            const result = await serverProxy.cloudStorages.delete(this.id);
            return result;
        },
    },
});

Object.defineProperties(CloudStorage.prototype.getContent, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(path: string, nextToken?: string): ReturnType<CloudStorage['getContent']> {
            const result = await serverProxy.cloudStorages.getContent(this.id, path, nextToken, this.manifestPath);
            return {
                next: result.next,
                content: result.content.map((item) => ({ ...omit(item, 'mime_type'), mimeType: item.mime_type })),
            };
        },
    },
});

Object.defineProperties(CloudStorage.prototype.preview, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(this: CloudStorage): Promise<string> {
            const preview = await serverProxy.cloudStorages.getPreview(this.id);
            if (!preview) return '';
            return decodePreview(preview);
        },
    },
});

Object.defineProperties(CloudStorage.prototype.getStatus, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<CloudStorageStatus> {
            const result = await serverProxy.cloudStorages.getStatus(this.id);
            return result;
        },
    },
});
