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
    getCore, FramesMetaData, Task, StorageLocation,
} from 'cvat-core-wrapper';

interface Props {
    task: Task;
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

async function getCloudStorageById(id: number): Promise<CloudStorage | null> {
    try {
        const data = await getCore().cloudStorages.get({ id });
        if (data.length === 1) {
            return data[0];
        }
    } catch (error) {
        notification.error({
            message: 'Could not fetch a cloud storage',
            description: error.toString(),
        });
    }
    return null;
}

export default function CloudStorageEditorComponent(props: Props): JSX.Element {
    const { task } = props;

    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [cloudStorageLoaded, setCloudStorageLoaded] = useState(false);
    const [cloudStorageEditing, setCloudStorageEditing] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');
    const [meta, setMeta] = useState<FramesMetaData | null>(null);

    useEffect(() => {
        task.meta.get().then((_meta) => {
            setMeta(_meta);
        });
    }, []);

    useEffect(() => {
        if (meta && meta.cloudStorageId) {
            getCloudStorageById(meta.cloudStorageId).then((_cloudStorage) => {
                setCloudStorage(_cloudStorage);
                setCloudStorageLoaded(true);
            });
        }
    }, [meta]);

    const updateCloudStorage = (_cloudStorage: CloudStorage | null): Promise<void> => (
        new Promise((resolve, reject) => {
            meta.cloudStorageId = _cloudStorage.id;
            task.meta.save(meta).then((updatedMeta: FramesMetaData) => {
                setMeta(updatedMeta);
                resolve();
            }).catch((error: Error) => {
                notification.error({
                    message: 'Could not update the task',
                    className: 'cvat-notification-notice-update-task-failed',
                    description: error.toString(),
                });
                reject();
            });
        })
    );

    return (
        meta && meta.storage === StorageLocation.CLOUD_STORAGE && (
            <Row justify='space-between' align='middle'>
                <Col span={12}>
                    <Row className='cvat-cloud-storage'>
                        { !cloudStorageEditing && <Col>Connected cloud storage:</Col> }
                        { !cloudStorageEditing && (
                            <Col>
                                { cloudStorageLoaded && cloudStorage && renderCloudStorageName(cloudStorage) }
                                { cloudStorageLoaded && !cloudStorage && 'MISSING' }
                                <Text
                                    className='cvat-issue-tracker-value'
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
                                    cloudStorage={cloudStorage}
                                    setSearchPhrase={setSearchPhrase}
                                    onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => {
                                        if (_cloudStorage) {
                                            updateCloudStorage(_cloudStorage);
                                        }
                                        setCloudStorageEditing(false);
                                    }}
                                />
                            </Col>
                        )}
                    </Row>
                </Col>
            </Row>
        )
    );
}
