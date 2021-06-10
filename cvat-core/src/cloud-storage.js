// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { ArgumentError } = require('./exceptions');
    const { CredentialsType, ProviderType } = require('./enums');

    /**
     * Class representing a cloud storage
     * @memberof module:API.cvat.classes
     */
    class CloudStorage {
        // TODO: add storage availability status (avaliable/unavaliable)
        constructor(initialData) {
            const data = {
                id: undefined,
                displayName: undefined,
                description: undefined,
                credentialsType: undefined,
                provider: undefined,
                resourceName: undefined,
                accountName: undefined,
                accesskey: undefined,
                secretKey: undefined,
                token: undefined,
                specificAttibutes: undefined,
                owner: undefined,
                created_date: undefined,
                updated_date: undefined,
                manifestPath: undefined,
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
                        get: () => data.displayName,
                        set: (value) => {
                            if (!value.trim().length) {
                                throw new ArgumentError('Value must not be empty');
                            }
                            data.displayName = value;
                        },
                    },
                    /**
                     * Storage description
                     * @name description
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     */
                    description: {
                        get: () => data.description,
                        set: (value) => {
                            data.description = value;
                        },
                    },
                    /**
                     * Account name (for Azure)
                     * @name accountName
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    accountName: {
                        get: () => data.accountName,
                        set: (value) => {
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.accountName = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
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
                        get: () => data.accessKey,
                        set: (value) => {
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.accesskey = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
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
                        get: () => data.secretKey,
                        set: (value) => {
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.secretKey = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
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
                        get: () => data.token,
                        set: (value) => {
                            if (typeof value === 'string') {
                                if (value.trim().length) {
                                    data.token = value;
                                } else {
                                    throw new ArgumentError('Value must not be empty');
                                }
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
                        get: () => data.resourceName,
                        set: (value) => {
                            if (!value.trim().length) {
                                throw new ArgumentError('Value must not be empty');
                            }
                            data.resourceName = value;
                        },
                    },
                    /**
                     * @name manifestPath
                     * @type {string}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     */
                    manifestPath: {
                        get: () => data.manifestPath,
                        set: (value) => {
                            if (typeof value !== undefined) {
                                data.manifestPath = value;
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
                        get: () => data.provider,
                        set: (value) => {
                            if (value !== undefined && !!ProviderType[value]) {
                                data.provider = value;
                            } else {
                                throw new ArgumentError('Value must be one from ProviderType values');
                            }
                        },
                    },
                    /**
                     * @name credentialsType
                     * @type {module:API.cvat.enums.CredentialsType}
                     * @memberof module:API.cvat.classes.CloudStorage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    credentialsType: {
                        get: () => data.credentialsType,
                        set: (value) => {
                            if (value !== undefined && !!CredentialsType[value]) {
                                data.credentialsType = value;
                            } else {
                                throw new ArgumentError('Value must be one from CredentialsType values');
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
                        get: () => data.specificAttibutes,
                        set: (attributesValue) => {
                            if (typeof attributesValue === 'string') {
                                for (const keyValuePair of attributesValue.split('&')) {
                                    const [key, value] = keyValuePair.split('=');
                                    if (key && value) {
                                        throw new ArgumentError('Value mast match the key1=value1&key2=value2');
                                    }
                                }
                                data.specificAttibutes = attributesValue;
                            } else {
                                throw new ArgumentError('Value mast be string');
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
                    // _internalData: {
                    //     get: () => data,
                    // },
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
                displayName: this.displayName,
                description: this.description ? this.description : null,
                credentialsType: this.credentialsType ? this.credentialsType : null,
                provided: this.provider ? this.provider : null,
                resourceName: this.resourceName ? this.resourceName : null,
                secretKey: this.secretKey ? this.secretKey : null,
                token: this.token ? this.token : null,
                accessKey: this.accessKey ? this.accessKey : null,
                accountName: this.accountName ? this.accountName : null,
                specificAttibutes: this.specificAttibutes ? this.specificAttibutes : null,
            };

            await serverProxy.cloudStorage.save(this.id, cloudStorageData);
            return this;
        }

        // create
        const cloudStorageData = {
            displayName: this.displayName,
            credentialsType: this.credentialsType,
            provider: this.provider,
            resourceName: this.resourceName,
        };

        if (this.description) {
            cloudStorageData.description = this.description;
        }

        if (this.accountName) {
            cloudStorageData.accountName = this.accountName;
        }

        if (this.accessKey) {
            cloudStorageData.accessKey = this.accessKey;
        }

        if (this.secretKey) {
            cloudStorageData.secretKey = this.secretKey;
        }

        if (this.token) {
            cloudStorageData.token = this.token;
        }

        if (this.specificAttibutes) {
            cloudStorageData.specificAttibutes = this.specificAttibutes;
        }

        const cloudStorage = await serverProxy.cloudStorages.create(cloudStorageData);
        return new CloudStorage(cloudStorage);
    };

    CloudStorage.prototype.delete.implementation = async function () {
        const result = await serverProxy.cloudStorages.delete(this.id);
        return result;
    };

    CloudStorage.prototype.getContent.implementation = async function () {
        const result = await serverProxy.cloudStorage.getContent(this.id, this.manifestPath);
        return result;
    };

    module.exports = {
        CloudStorage,
    };
})();
