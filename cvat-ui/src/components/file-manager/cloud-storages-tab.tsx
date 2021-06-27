// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-unused-vars */
import './styles.scss';
import React, {
    ReactText, useCallback, useEffect, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Form, { FormInstance } from 'antd/lib/form';
import Tabs from 'antd/lib/tabs';
import { CloudTwoTone, PlusCircleOutlined } from '@ant-design/icons';
import { CloudStoragesQuery, CombinedState, CloudStorage } from 'reducers/interfaces';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import CloudStorageFiles from './cloud-storages-files';

interface Props {
    formRef: any,
    cloudStorageId: number | null,
    onCheckFiles: (checkedKeysValue: ReactText[]) => void,
    onSelectCloudStorage: (cloudStorageId: number | null) => void,
}

export default function CloudStorageTab(props: Props): JSX.Element {
    const {
        formRef, cloudStorageId, onCheckFiles, onSelectCloudStorage,
    } = props;
    const dispatch = useDispatch();
    const history = useHistory();
    const initialized = useSelector((state: CombinedState) => state.cloudStorages.initialized);
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);
    const totalCount = useSelector((state: CombinedState) => state.cloudStorages.count);
    const query = useSelector((state: CombinedState) => state.cloudStorages.gettingQuery);
    const cloudStorages = useSelector((state: CombinedState) => state.cloudStorages.current);
    const { Option } = Select;

    // const [cloudStorageID, setSelectedCloudStorageID] = useState<number | null>(null);

    useEffect(
        () => {
            if (!isFetching && !initialized) dispatch(getCloudStoragesAsync({ ...query }));
        },
        [cloudStorages],
    );

    const cloudStoragesArray = [];
    for (const curCloudStorage of cloudStorages) {
        cloudStoragesArray.push(
            <Option
                key={curCloudStorage.id}
                value={curCloudStorage.id}
            >
                {curCloudStorage.displayName}
            </Option>,
        );
    }

    return (
        <Form
            className='cvat-create-task-page-cloud-storages-tab-form'
            layout='vertical'
            ref={formRef}
        >
            <Form.Item
                className='cvat-create-task-page-cloud-storages-tab-select-storage'
                label='Select cloud storage:'
                name='cloudStorageSelect'
                rules={[{ required: true, message: 'Please, select a cloud stoarge' }]}
            >
                <Select
                    onSelect={(id:number) => onSelectCloudStorage(id)}
                >
                    {cloudStoragesArray}
                </Select>
            </Form.Item>
            {totalCount ? (
                cloudStorageId && (
                    <CloudStorageFiles
                        id={cloudStorageId}
                        onCheckFiles={onCheckFiles}
                    />
                )
            ) : (
                <div className='cvat-empty-cloud-storages-tree'>
                    <CloudTwoTone className='cvat-cloud-storage-icon' twoToneColor='#40a9ff' />
                    <Paragraph className='cvat-text-color'>Your have not avaliable storages yet</Paragraph>
                </div>
            )}
        </Form>
    );
}
