// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT


(() => {
    const { ArgumentError } = require('./exceptions');
    const { StorageLocation } = require('./enums');

    interface StorageI {
        location: typeof StorageLocation,
        cloud_storage_id?: number,
    }

    /**
     * Class representing a storage for import and export resources
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Storage {
        location: typeof StorageLocation;
        cloudStorageID: number;
        constructor(initialData) {
            const data = {
                location: undefined,
                cloud_storage_id: undefined,
            };

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                        data[key] = initialData[key];
                    }
                }
            }

            Object.defineProperties(
                this,
                Object.freeze({
                    /**
                     * @name location
                     * @type {module:API.cvat.enums.StorageLocation}
                     * @memberof module:API.cvat.classes.Storage
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    location: {
                        get: () => data.location,
                        set: (key) => {
                            if (key !== undefined && !!StorageLocation[key]) {
                                data.location = StorageLocation[key];
                            } else {
                                throw new ArgumentError('Value must be one of the StorageLocation keys');
                            }
                        },
                    },
                    /**
                     * @name cloudStorageID
                     * @type {number}
                     * @memberof module:API.cvat.classes.Storage
                     * @instance
                     */
                    cloudStorageID: {
                        get: () => data.cloud_storage_id,
                        set: (cloudStorageID) => {
                            data.cloud_storage_id = cloudStorageID;
                        },
                    },
                }),
            );
        }

        toJSON() {
            const object: StorageI = {
                location: this.location,
            };

            if (typeof this.cloudStorageID !== 'undefined') {
                object.cloud_storage_id = this.cloudStorageID;
            }

            return object;
        }
    }

    module.exports = {
        Storage,
    };
})();
