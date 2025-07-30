// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import notification from 'antd/lib/notification';
import { Row, Col } from 'antd/lib/grid';
import { CloudStorage } from 'reducers';
import { AzureProvider, GoogleCloudProvider, S3Provider } from 'icons';
import { ProviderType } from 'utils/enums';
import Text from 'antd/lib/typography/Text';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';
import {
    getCore, FramesMetaData, StorageLocation,
} from 'cvat-core-wrapper';

interface Props {
    taskMeta: FramesMetaData,
    cloudStorageInstance: CloudStorage,
    onUpdateTaskMeta: (meta: FramesMetaData) => Promise<void>;
}

function renderCloudStorageName(cloudStorage: CloudStorage): JSX.Element {
    const { providerType, displayName } = cloudStorage;
    return (
        <span>
            {providerType === ProviderType.AWS_S3_BUCKET && <S3Provider />}
            {providerType === ProviderType.AZURE_CONTAINER && <AzureProvider />}
            {providerType === ProviderType.GOOGLE_CLOUD_STORAGE && <GoogleCloudProvider />}
            {displayName}
        </span>
    );
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
    const { task, taskMeta, cloudStorageInstance, onUpdateTaskMeta } = props;

    const [cloudStorageEditing, setCloudStorageEditing] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');

    const updateCloudStorage = (_cloudStorage: CloudStorage | null): Promise<void> => (
        new Promise((resolve, reject) => {
            taskMeta.cloudStorageId = _cloudStorage.id;
            onUpdateTaskMeta(taskMeta);
        })
    );

    return (
        taskMeta.storage === StorageLocation.CLOUD_STORAGE && (
            <Row className='cvat-task-cloud-storage'>
                { !cloudStorageEditing && <Text type='secondary'>Connected cloud storage:</Text> }
                { !cloudStorageEditing && (
                    <Col>
                        { cloudStorageInstance && renderCloudStorageName(cloudStorageInstance) }
                        { !cloudStorageInstance && 'MISSING' }
                        <Text
                            className='cvat-task-cloud-storage-value'
                            editable={{
                                editing: cloudStorageEditing,
                                onStart: (): void => setCloudStorageEditing(true),
                            }}
                        />
                    </Col>
                )}
                { cloudStorageEditing && (
                    <Col>
                        <SelectCloudStorage
                            searchPhrase={searchPhrase}
                            cloudStorage={cloudStorageInstance}
                            setSearchPhrase={setSearchPhrase}
                            onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => {
                                if (_cloudStorage) {
                                    updateCloudStorage(_cloudStorage);
                                }
                                setCloudStorageEditing(false);
                            }}
                            required={false}
                        />
                    </Col>
                 )}
             </Row>
        )
    );
}
