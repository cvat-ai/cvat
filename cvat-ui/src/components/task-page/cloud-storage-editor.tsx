// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import notification from 'antd/lib/notification';
import { CloudStorage } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';
import {
    getCore, FramesMetaData, StorageLocation,
} from 'cvat-core-wrapper';

interface Props {
    taskMeta: FramesMetaData,
    cloudStorageInstance: CloudStorage,
    onUpdateTaskMeta: (meta: FramesMetaData) => Promise<void>;
}

export async function getCloudStorageById(id: number): Promise<CloudStorage | null> {
    try {
        const [data] = await getCore().cloudStorages.get({ id });
        return data;
    } catch (error) {
        notification.error({
            message: 'Could not fetch a cloud storage',
            description: error.toString(),
        });
    }
    return null;
}

export default function CloudStorageEditorComponent(props: Props): JSX.Element {
    const { taskMeta, cloudStorageInstance, onUpdateTaskMeta } = props;

    const [searchPhrase, setSearchPhrase] = useState(cloudStorageInstance ? cloudStorageInstance.displayName : '');

    return (
        taskMeta.storage === StorageLocation.CLOUD_STORAGE && (
            <SelectCloudStorage
                searchPhrase={searchPhrase}
                cloudStorage={cloudStorageInstance}
                setSearchPhrase={setSearchPhrase}
                onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => {
                    if (_cloudStorage) {
                        taskMeta.cloudStorageId = _cloudStorage.id;
                        onUpdateTaskMeta(taskMeta);
                    } else {
                        setSearchPhrase(cloudStorageInstance ? cloudStorageInstance.displayName : '');
                    }
                }}
                secondary
            />
        )
    );
}
