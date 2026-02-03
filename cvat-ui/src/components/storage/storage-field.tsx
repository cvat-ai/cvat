// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Select from 'antd/lib/select';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import { CloudStorage } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';

import { StorageData, StorageLocation } from 'cvat-core-wrapper';

const { Option } = Select;

export interface Props {
    locationName: string[];
    selectCloudStorageName: string[];
    locationValue: StorageLocation;
    onChangeLocationValue?: (value: StorageLocation) => void;
    onChangeStorage?: (value: StorageData) => void;
}

export default function StorageField(props: Props): JSX.Element {
    const {
        locationName,
        selectCloudStorageName,
        locationValue,
        onChangeStorage,
        onChangeLocationValue,
    } = props;
    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [potentialCloudStorage, setPotentialCloudStorage] = useState('');
    const [serverPath, setServerPath] = useState('');
    const [storageType, setStorageType] = useState('');

    useEffect(() => {
        setStorageType(locationName[0].replace('Storage', '-storage'));
    }, [locationName]);

    function renderCloudStorage(): JSX.Element {
        return (
            <SelectCloudStorage
                searchPhrase={potentialCloudStorage}
                cloudStorage={cloudStorage}
                setSearchPhrase={(cs: string) => {
                    setPotentialCloudStorage(cs);
                }}
                name={selectCloudStorageName}
                onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => setCloudStorage(_cloudStorage)}
            />
        );
    }

    function renderServerPath(): JSX.Element {
        return (
            <Form.Item
                label={<Text>Server path (absolute path on the server)</Text>}
                name={['targetStorage', 'serverPath']}
                rules={[{ required: true, message: 'Please enter a server path' }]}
            >
                <Input
                    placeholder='/data/exports/my_export.zip'
                    value={serverPath}
                    onChange={(e) => {
                        setServerPath(e.target.value);
                        if (onChangeStorage) {
                            onChangeStorage({
                                location: StorageLocation.SERVER_PATH,
                                serverPath: e.target.value,
                            });
                        }
                    }}
                    className={`cvat-input-${storageType}-server-path`}
                />
            </Form.Item>
        );
    }

    useEffect(() => {
        if (locationValue === StorageLocation.LOCAL) {
            setPotentialCloudStorage('');
            setServerPath('');
        } else if (locationValue === StorageLocation.CLOUD_STORAGE) {
            setServerPath('');
        } else if (locationValue === StorageLocation.SERVER_PATH) {
            setPotentialCloudStorage('');
        }
    }, [locationValue]);

    useEffect(() => {
        if (onChangeStorage) {
            onChangeStorage({
                location: locationValue,
                cloudStorageId: cloudStorage?.id ? parseInt(cloudStorage?.id, 10) : undefined,
                serverPath: locationValue === StorageLocation.SERVER_PATH ? serverPath : undefined,
            });
        }
    }, [cloudStorage, locationValue, serverPath]);

    return (
        <>
            <Form.Item name={locationName}>
                <Select
                    virtual={false}
                    onChange={(location: StorageLocation) => {
                        if (onChangeLocationValue) onChangeLocationValue(location);
                    }}
                    onClear={() => {
                        if (onChangeLocationValue) onChangeLocationValue(StorageLocation.LOCAL);
                    }}
                    allowClear
                    className={`cvat-select-${storageType}`}
                >
                    <Option
                        value={StorageLocation.LOCAL}
                        key={`${storageType}-${StorageLocation.LOCAL.toLowerCase()}`}
                        className={`cvat-select-${storageType}-location`}
                    >
                        Local
                    </Option>
                    <Option
                        value={StorageLocation.CLOUD_STORAGE}
                        key={`${storageType}-${StorageLocation.CLOUD_STORAGE.toLowerCase()}`}
                        className={`cvat-select-${storageType}-location`}
                    >
                        Cloud storage
                    </Option>
                    <Option
                        value={StorageLocation.SERVER_PATH}
                        key={`${storageType}-${StorageLocation.SERVER_PATH.toLowerCase()}`}
                        className={`cvat-select-${storageType}-location`}
                    >
                        Server path
                    </Option>
                </Select>
            </Form.Item>
            {locationValue === StorageLocation.CLOUD_STORAGE && renderCloudStorage()}
            {locationValue === StorageLocation.SERVER_PATH && renderServerPath()}
        </>
    );
}
