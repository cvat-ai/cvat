// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { isBrowser, isNode } = require('browser-or-node');
    const { ArgumentError } = require('./exceptions');
    const { CloudStorageCredentialsType, CloudStorageProviderType } = require('./enums');

    function validateNotEmptyString(value) {
        if (typeof value !== 'string') {
            throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
        } else if (!value.trim().length) {
            throw new ArgumentError('Value mustn\'t be empty string');
        }
    }

    /**
     * Class representing a cloud storage
     * @memberof module:API.cvat.classes
     */
    class CloudStorage {
        constructor(initialData) {
            const data = {
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
                    /**
                     * @name id
                     * @type {integer}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @readonly
                     * @instance
                     */
                    id: {
                        get: () => data.id,
                    },
                    /**
                     * Storage name
                     * @name displayName
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    displayName: {
                        get: () => data.display_name,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.display_name = value;
                        },
                    },
                    /**
                     * Storage description
                     * @name description
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    description: {
                        get: () => data.description,
                        set: (value) => {
                            if (typeof value !== 'string') {
                                throw new ArgumentError('Value must be string');
                            }
                            data.description = value;
                        },
                    },
                    /**
                     * Azure account name
                     * @name accountName
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    accountName: {
                        get: () => data.account_name,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.account_name = value;
                        },
                    },
                    /**
                     * AWS access key id
                     * @name accessKey
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    accessKey: {
                        get: () => data.key,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.key = value;
                        },
                    },
                    /**
                     * AWS secret key
                     * @name secretKey
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    secretKey: {
                        get: () => data.secret_key,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.secret_key = value;
                        },
                    },
                    /**
                     * Session token
                     * @name token
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    token: {
                        get: () => data.session_token,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.session_token = value;
                        },
                    },
                    /**
                     * Key file
                     * @name keyFile
                     * @type {File}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
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
                    /**
                     * Unique resource name
                     * @name resourceName
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    resourceName: {
                        get: () => data.resource,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.resource = value;
                        },
                    },
                    /**
                     * @name manifestPath
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    manifestPath: {
                        get: () => data.manifest_path,
                        set: (value) => {
                            validateNotEmptyString(value);
                            data.manifest_path = value;
                        },
                    },
                    /**
                     * @name providerType
                     * @type {module:API.cvat.enums.ProviderType}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
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
                    /**
                     * @name credentialsType
                     * @type {module:API.cvat.enums.CloudStorageCredentialsType}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
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
                    /**
                     * @name specificAttributes
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
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
                    /**
                     * Instance of a user who has created the cloud storage
                     * @name owner
                     * @type {module:API.cvat.classes.User}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @readonly
                     * @instance
                     */
                    owner: {
                        get: () => data.owner,
                    },
                    /**
                     * @name createdDate
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @readonly
                     * @instance
                     */
                    createdDate: {
                        get: () => data.created_date,
                    },
                    /**
                     * @name updatedDate
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @readonly
                     * @instance
                     */
                    updatedDate: {
                        get: () => data.updated_date,
                    },
                    /**
                     * @name manifests
                     * @type {string[]}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
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
                }),
            );
        }

        /**
         * Method updates data of a created cloud storage or creates new cloud storage
         * @method save
         * @returns {module:API.cvat.classes.CloudStorage}
         * @memberof module:API.cvat.classes.CloudStorage
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async save() {
            const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.save);
            return result;
        }

        /**
         * Method deletes a cloud storage from a server
         * @method delete
         * @memberof module:API.cvat.classes.CloudStorage
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async delete() {
            const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.delete);
            return result;
        }

        /**
         * Method returns cloud storage content
         * @method getContent
         * @memberof module:API.cvat.classes.CloudStorage
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async getContent() {
            const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.getContent);
            return result;
        }

        /**
         * Method returns the cloud storage preview
         * @method getPreview
         * @memberof module:API.cvat.classes.CloudStorage
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async getPreview() {
            const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.getPreview);
            return result;
        }

        /**
         * Method returns cloud storage status
         * @method getStatus
         * @memberof module:API.cvat.classes.CloudStorage
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async getStatus() {
            const result = await PluginRegistry.apiWrapper.call(this, CloudStorage.prototype.getStatus);
            return result;
        }
    }

    CloudStorage.prototype.save.implementation = async function () {
        function prepareOptionalFields(cloudStorageInstance) {
            const data = {};
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

            if (cloudStorageInstance.specificAttributes !== undefined) {
                data.specific_attributes = cloudStorageInstance.specificAttributes;
            }
            return data;
        }
        // update
        if (typeof this.id !== 'undefined') {
            // provider_type and recource should not change;
            // send to the server only the values that have changed
            const initialData = {};
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
        const initialData = {
            display_name: this.displayName,
            credentials_type: this.credentialsType,
            provider_type: this.providerType,
            resource: this.resourceName,
            manifests: this.manifests,
        };

        const cloudStorageData = {
            ...initialData,
            ...prepareOptionalFields(this),
        };

        const cloudStorage = await serverProxy.cloudStorages.create(cloudStorageData);
        return new CloudStorage(cloudStorage);
    };

    CloudStorage.prototype.delete.implementation = async function () {
        const result = await serverProxy.cloudStorages.delete(this.id);
        return result;
    };

    CloudStorage.prototype.getContent.implementation = async function () {
        const result = await serverProxy.cloudStorages.getContent(this.id, this.manifestPath);
        return result;
    };

    CloudStorage.prototype.getPreview.implementation = async function getPreview() {
        return new Promise((resolve, reject) => {
            serverProxy.cloudStorages
                .getPreview(this.id)
                .then((result) => {
                    if (isNode) {
                        resolve(global.Buffer.from(result, 'binary').toString('base64'));
                    } else if (isBrowser) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(reader.result);
                        };
                        reader.readAsDataURL(result);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    };

    CloudStorage.prototype.getStatus.implementation = async function () {
        const result = await serverProxy.cloudStorages.getStatus(this.id);
        return result;
    };

    module.exports = {
        CloudStorage,
    };
})();
