// (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { RefObject, useState } from 'react';
import Form, { FormInstance } from 'antd/lib/form';

import Text from 'antd/lib/typography/Text';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import StorageField from './storage';
import { Storage, StorageLocation } from 'reducers/interfaces';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';


export interface Props {
    formRef: RefObject<FormInstance>;
    projectId: number | null;
    storageLabel: string;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useProjectStorage?: boolean | null;
    onChangeStorage: (values: Storage) => void;
    onChangeUseProjectStorage?: (value: boolean) => void;
}

const initialValues: any = {
    location: StorageLocation.LOCAL,
    cloudStorageId: null,
};

export default function StorageForm(props: Props): JSX.Element {
    const { formRef, projectId, switchDescription, switchHelpMessage, storageDescription, useProjectStorage, storageLabel, onChangeUseProjectStorage, onChangeStorage,
    } = props;


    return (
        <Form
            ref={formRef}
            layout='vertical'
            initialValues={initialValues}
        >
            { !!projectId &&
            <Space>
                <Form.Item
                    name='useProjectStorage'
                >
                    <Switch
                        defaultChecked
                        onChange={(value: boolean) => {
                            if (onChangeUseProjectStorage) {
                                onChangeUseProjectStorage(value)
                            }
                        }}
                    />
                </Form.Item>
                <Text strong>{switchDescription}</Text>
                {(switchHelpMessage) ? <Tooltip title={switchHelpMessage}>
                    <QuestionCircleOutlined/>
                </Tooltip> : null}
            </Space>}

            {(!projectId || !useProjectStorage) && <StorageField
                label={storageLabel}
                description={storageDescription as string}
                onChangeStorage={onChangeStorage}
            />}
        </Form>
    );
}
