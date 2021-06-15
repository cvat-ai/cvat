// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { ArgumentError } = require('./exceptions');
    const { CloudStorageCredentialsType, CloudStorageProviderType } = require('./enums');

    /**
     * Class representing a cloud storage
     * @memberof module:API.cvat.classes
     */
    class CloudStorage {
        // TODO: add storage availability status (avaliable/unavaliable)
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
                specific_attibutes: undefined,
                owner: undefined,
                created_date: undefined,
                updated_date: undefined,
                manifest_path: undefined,
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
                            if (typeof value !== 'string') {
                                throw new ArgumentError(`Value must be string. ${typeof value} was found`);
                            } else if (!value.trim().length) {
                                throw new ArgumentError('Value must not be empty string');
                            }
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
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.account_name = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
                            } else {
                                throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
                            }
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
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.key = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
                            } else {
                                throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
                            }
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
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.secret_key = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
                            } else {
                                throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
                            }
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
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.session_token = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
                            } else {
                                throw new ArgumentError(`Value must be a string. ${typeof value} was found`);
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
                            if (typeof value !== 'string') {
                                throw new ArgumentError(`Value must be string. ${typeof value} was found`);
                            } else if (!value.trim().length) {
                                throw new ArgumentError('Value must not be empty');
                            }
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
                            if (typeof value !== 'string') {
                                data.manifest_path = value;
                            } else {
                                throw new ArgumentError('Value must be a string');
                            }
                        },
                    },
                    /**
                     * @name provider
                     * @type {module:API.cvat.enums.ProviderType}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    provider: {
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
                     * @name specificAttibutes
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    specificAttibutes: {
                        get: () => data.specific_attibutes,
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
                                data.specific_attibutes = attributesValue;
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
    }

    CloudStorage.prototype.save.implementation = async function () {
        // update
        if (typeof this.id !== 'undefined') {
            const cloudStorageData = {
                display_name: this.displayName,
                description: this.description ? this.description : null,
                credentials_type: this.credentialsType ? this.credentialsType : null,
                provided_type: this.provider ? this.provider : null,
                resource: this.resourceName ? this.resourceName : null,
                secret_key: this.secretKey ? this.secretKey : null,
                session_token: this.token ? this.token : null,
                key: this.accessKey ? this.accessKey : null,
                account_name: this.accountName ? this.accountName : null,
                specific_attibutes: this.specificAttibutes ? this.specificAttibutes : null,
            };

            await serverProxy.cloudStorages.update(this.id, cloudStorageData);
            return this;
        }

        // create
        const cloudStorageData = {
            display_name: this.displayName,
            credentials_type: this.credentialsType,
            provider_type: this.provider,
            resource: this.resourceName,
        };

        if (this.description) {
            cloudStorageData.description = this.description;
        }

        if (this.accountName) {
            cloudStorageData.account_name = this.accountName;
        }

        if (this.accessKey) {
            cloudStorageData.key = this.accessKey;
        }

        if (this.secretKey) {
            cloudStorageData.secret_key = this.secretKey;
        }

        if (this.token) {
            cloudStorageData.session_token = this.token;
        }

        if (this.specificAttibutes) {
            cloudStorageData.specific_attibutes = this.specificAttibutes;
        }

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

    module.exports = {
        CloudStorage,
    };
})();
