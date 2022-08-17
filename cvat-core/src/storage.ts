// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { StorageLocation } from 'enums';

/**
 * Class representing a storage for import and export resources
 * @memberof module:API.cvat.classes
 * @hideconstructor
 */
export default class Storage {
    public location: StorageLocation;
    public cloudStorageId: number;
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
                 * @name cloudStorageId
                 * @type {number}
                 * @memberof module:API.cvat.classes.Storage
                 * @instance
                 */
                cloudStorageId: {
                    get: () => data.cloud_storage_id,
                    set: (cloudStorageId) => {
                        data.cloud_storage_id = cloudStorageId;
                    },
                },
            }),
        );
    }
}