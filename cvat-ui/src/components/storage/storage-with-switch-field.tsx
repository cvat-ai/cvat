// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Form from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { StorageData } from 'cvat-core-wrapper';
import { StorageLocation } from 'reducers';
import StorageField from './storage-field';

export interface Props {
    instanceId: number | null;
    storageName: string;
    storageLabel: string;
    switchName: string;
    locationValue: StorageLocation;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useDefaultStorage?: boolean | null;
    onChangeLocationValue?: (value: StorageLocation) => void;
    onChangeStorage?: (values: StorageData) => void;
    onChangeUseDefaultStorage?: (value: boolean) => void;
}

export default function StorageWithSwitchField(props: Props): JSX.Element {
    const {
        instanceId,
        storageName,
        storageLabel,
        switchName,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useDefaultStorage,
        locationValue,
        onChangeUseDefaultStorage,
        onChangeStorage,
        onChangeLocationValue,
    } = props;

    return (
        <>
            {
                !!instanceId && (
                    <Space>
                        <Form.Item
                            name={switchName}
                            valuePropName='checked'
                            className='cvat-settings-switch cvat-switch-use-default-storage'
                        >
                            <Switch
                                onChange={(value: boolean) => {
                                    if (onChangeUseDefaultStorage) {
                                        onChangeUseDefaultStorage(value);
                                    }
                                }}
                            />
                        </Form.Item>
                        <Text strong>{switchDescription}</Text>
                        {(switchHelpMessage) ? (
                            <Tooltip title={switchHelpMessage}>
                                <QuestionCircleOutlined />
                            </Tooltip>
                        ) : null}
                    </Space>
                )
            }
            {
                (!instanceId || !useDefaultStorage) && (
                    <Form.Item
                        label={(
                            <Space>
                                {storageLabel}
                                <CVATTooltip title={storageDescription}>
                                    <QuestionCircleOutlined
                                        style={{ opacity: 0.5 }}
                                    />
                                </CVATTooltip>
                            </Space>
                        )}
                    >
                        <StorageField
                            locationName={[storageName, 'location']}
                            selectCloudStorageName={[storageName, 'cloudStorageId']}
                            locationValue={locationValue}
                            onChangeStorage={onChangeStorage}
                            onChangeLocationValue={onChangeLocationValue}
                        />
                    </Form.Item>
                )
            }
        </>
    );
}
