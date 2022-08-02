// (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { QuestionCircleFilled } from '@ant-design/icons';
import Select from 'antd/lib/select';
import Form from 'antd/lib/form';

import { CloudStorage } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';
import { StorageLocation } from 'reducers/interfaces';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';
import Space from 'antd/lib/space';

import { Storage } from 'reducers/interfaces';

const { Option } = Select;

export interface Props {
    label: string;
    description: string;
    onChangeStorage?: (value: Storage) => void;
}

export default function StorageField(props: Props): JSX.Element {
    const { label, description, onChangeStorage } = props;
    const [locationValue, setLocationValue] = useState(StorageLocation.LOCAL);
    const [cloudStorage, setCloudStorage] = useState<CloudStorage | null>(null);
    const [potentialCloudStorage, setPotentialCloudStorage] = useState('');

    function renderCloudStorageId(): JSX.Element {
        return (
            <SelectCloudStorage
                searchPhrase={potentialCloudStorage}
                cloudStorage={cloudStorage}
                setSearchPhrase={(cs: string) => {
                    setPotentialCloudStorage(cs);
                }}
                name='cloudStorageId'
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
            <Form.Item
                name='location'
                label={(
                    <>
                        <Space>
                            {label}
                            <CVATTooltip title={description}>
                                <QuestionCircleFilled
                                    // className='cvat-question-circle-filled-icon'
                                    style={{ opacity: 0.5 }}
                                />
                            </CVATTooltip>
                        </Space>
                    </>
                )}
            >
                <Select
                    defaultValue={StorageLocation.LOCAL}
                    onChange={(location: StorageLocation) => setLocationValue(location)}
                >
                    <Option value={StorageLocation.LOCAL}>Local</Option>
                    <Option value={StorageLocation.CLOUD_STORAGE}>Cloud storage</Option>
                </Select>
            </Form.Item>
            {locationValue === StorageLocation.CLOUD_STORAGE && renderCloudStorageId()}
        </>
    );
}
