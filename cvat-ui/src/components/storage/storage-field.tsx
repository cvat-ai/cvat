// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Select from 'antd/lib/select';
import Form from 'antd/lib/form';
import { CloudStorage, Storage, StorageLocation } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';

const { Option } = Select;

export interface Props {
    locationName: string[];
    selectCloudStorageName: string[];
    onChangeStorage?: (value: Storage) => void;
}

export default function StorageField(props: Props): JSX.Element {
    const {
        locationName,
        selectCloudStorageName,
        onChangeStorage
    } = props;
    const [locationValue, setLocationValue] = useState(StorageLocation.LOCAL);
    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [potentialCloudStorage, setPotentialCloudStorage] = useState('');

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

    useEffect(() => {
        if (locationValue === StorageLocation.LOCAL) {
            setCloudStorage(null);
        }
    }, [locationValue]);

    useEffect(() => {
        if (onChangeStorage) {
            onChangeStorage({
                location: locationValue,
                cloudStorageId: cloudStorage?.id,
            } as Storage);
        }
    }, [cloudStorage, locationValue]);

    return (
        <>
            <Form.Item name={locationName}>
                <Select
                    onChange={(location: StorageLocation) => setLocationValue(location)}
                    onClear={() => setLocationValue(StorageLocation.LOCAL)}
                    allowClear
                >
                    <Option value={StorageLocation.LOCAL}>Local</Option>
                    <Option value={StorageLocation.CLOUD_STORAGE}>Cloud storage</Option>
                </Select>
            </Form.Item>
            {locationValue === StorageLocation.CLOUD_STORAGE && renderCloudStorage()}
        </>
    );
}
