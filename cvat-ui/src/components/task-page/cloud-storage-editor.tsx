// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import { searchCloudStorages } from 'components/select-cloud-storage/select-cloud-storage';
import { CloudStorage } from 'reducers';
import { AzureProvider, GoogleCloudProvider, S3Provider } from 'icons';
import { ProviderType } from 'utils/enums';

interface Props {
    instance: any;
    onChange: (cloudStorage: string) => void;
}

function renderCloudStorageName(cloudStorage: CloudStorage): JSX.Element {
    const { providerType, displayName } = cloudStorage;
    return (
        <Row>
            {providerType === ProviderType.AWS_S3_BUCKET && <S3Provider />}
            {providerType === ProviderType.AZURE_CONTAINER && <AzureProvider />}
            {providerType === ProviderType.GOOGLE_CLOUD_STORAGE && <GoogleCloudProvider />}
            {displayName}
        </Row>
    );
}

export default function CloudStorageEditorComponent(props: Props): JSX.Element {
    const { instance } = props;

    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [cloudStorageEditing, setCloudStorageEditing] = useState(false);

    const onStart = (): void => setCloudStorageEditing(true);

    console.log('FOOOOOO cseditor 2', instance.dataStorage);

    useEffect(() => {
        searchCloudStorages({}).then((data) => {
            console.log('FOOOOOO cseditor effect 1', data);
            const cs = data.find((storage) => storage.id === instance.dataStorage.cloudStorageId);
            console.log('FOOOOOO cseditor effect 2', cs);
            setCloudStorage(cs);
        });
    }, []);

    //                <SelectCloudStorage
    //                    cloudStorage={cloudStorage}
    //                />

    return (
        <Row className='cvat-cloud-storage'>
            <Col>
                Connected cloud storage:
            </Col>
            <Col>
                { cloudStorage && renderCloudStorageName(cloudStorage) }
                { !cloudStorage && 'MISSING' }
            </Col>
            <Col>
                <Text
                    className='cvat-cloud-storage-value'
                    editable={{
                        editing: cloudStorageEditing,
                        onStart,
                        //                        onChange: onChangeValue,
                    }}
                />
            </Col>
        </Row>
    );
}
