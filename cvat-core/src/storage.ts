// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { StorageLocation } from './enums';

export interface StorageData {
    location: StorageLocation;
    cloudStorageId?: number;
    serverPath?: string;
}

interface StorageJsonData {
    location: StorageLocation;
    cloud_storage_id?: number;
    server_path?: string;
}

export class Storage {
    public location: StorageLocation;
    public cloudStorageId: number;
    public serverPath: string;

    constructor(initialData: StorageData) {
        const data: StorageData = {
            location: initialData.location,
            cloudStorageId: initialData?.cloudStorageId,
            serverPath: initialData?.serverPath,
        };

        Object.defineProperties(
            this,
            Object.freeze({
                location: {
                    get: () => data.location,
                },
                cloudStorageId: {
                    get: () => data.cloudStorageId,
                },
                serverPath: {
                    get: () => data.serverPath,
                },
            }),
        );
    }
    toJSON(): StorageJsonData {
        return {
            location: this.location,
            ...(this.cloudStorageId ? {
                cloud_storage_id: this.cloudStorageId,
            } : {}),
            ...(this.serverPath ? {
                server_path: this.serverPath,
            } : {}),
        };
    }
}
