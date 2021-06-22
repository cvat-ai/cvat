// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-unused-vars */
import './styles.scss';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import { EditOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers/interfaces';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import UpdateCloudStorageContent, { Props } from './update-cloud-storage-content';

interface ParamType {
    id: string;
}

export default function UpdateCloudStoragePageComponent(): JSX.Element {
    const id = +useParams<ParamType>().id;
    const dispatch = useDispatch();
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);

    const cloudStorages = useSelector((state: CombinedState) =>
        state.cloudStorages.current);
    const [cloudStorage] = cloudStorages.filter((_cloudStorage) => _cloudStorage.id === id);

    useEffect(() => {
        dispatch(
            getCloudStoragesAsync({
                id,
            }),
        );
    }, [id, dispatch]);

    if (isFetching) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!cloudStorage) {
        return (
            <Result
                className='cvat-not-found'
                status='404'
                title='Sorry, but this cloud storage was not found'
                subTitle='Please, be sure information you tried to get exist and you have access'
            />
        );
    }

    return (
        <Row justify='center' align='top' className='cvat-update-cloud-storage-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <span className='cvat-title'>
                    <Text>Cloud storage editor</Text>
                    <EditOutlined />
                </span>
                <UpdateCloudStorageContent cloudStorage={cloudStorage} />
            </Col>
        </Row>
    );
}
