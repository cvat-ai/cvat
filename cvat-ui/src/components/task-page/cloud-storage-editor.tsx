// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { CloudStorage } from 'reducers';
import { AzureProvider, GoogleCloudProvider, S3Provider } from 'icons';
import { ProviderType } from 'utils/enums';
import Text from 'antd/lib/typography/Text';
import SelectCloudStorage, { searchCloudStorages } from 'components/select-cloud-storage/select-cloud-storage';

interface Props {
    instance: any;
    onChange: (cloudStorage: CloudStorage | null) => void;
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

export default function CloudStorageEditorComponent(props: Props): JSX.Element {
    const { instance, onChange } = props;

    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [cloudStorageLoaded, setCloudStorageLoaded] = useState(false);
    const [cloudStorageEditing, setCloudStorageEditing] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');

    useEffect(() => {
        searchCloudStorages({}).then((data) => {
            const cs = data.find((storage) => storage.id === instance.dataStorage.cloudStorageId);
            console.log('FOOOOOO cseditor effect 2', cs);
            setCloudStorage(cs);
            setCloudStorageLoaded(true);
        });
    }, []);

    return (
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
                            setCloudStorage(_cloudStorage);
                            setCloudStorageEditing(false);
                            onChange(_cloudStorage);
                        }}
                    />
                </Col>
            )}
        </Row>
    );
}
