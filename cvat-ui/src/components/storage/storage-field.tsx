// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Select from 'antd/lib/select';
import Form from 'antd/lib/form';
import { CloudStorage, StorageLocation } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';

import { StorageData } from 'cvat-core-wrapper';

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
            setPotentialCloudStorage('');
        }
    }, [locationValue]);

    useEffect(() => {
        if (onChangeStorage) {
            onChangeStorage({
                location: locationValue,
                cloudStorageId: cloudStorage?.id ? parseInt(cloudStorage?.id) : undefined,
            });
        }
    }, [cloudStorage, locationValue]);

    return (
        <>
            <Form.Item name={locationName}>
                <Select
                    onChange={(location: StorageLocation) => {
                        if (onChangeLocationValue) onChangeLocationValue(location)
                    }}
                    onClear={() => {
                        if (onChangeLocationValue) onChangeLocationValue(StorageLocation.LOCAL)
                    }}
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
