// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';

import { CombinedState } from 'reducers/interfaces';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import CreateCloudStorageForm from 'components/create-cloud-storage-page/cloud-storage-form';

interface ParamType {
    id: string;
}

export default function UpdateCloudStoragePageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const cloudStorageId = +useParams<ParamType>().id;
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);
    const isInitialized = useSelector((state: CombinedState) => state.cloudStorages.initialized);
    const cloudStorages = useSelector((state: CombinedState) => state.cloudStorages.current);
    const [cloudStorage] = cloudStorages.filter((_cloudStorage) => _cloudStorage.id === cloudStorageId);

    useEffect(() => {
        if (!cloudStorage && !isFetching) {
            dispatch(getCloudStoragesAsync({ id: cloudStorageId }));
        }
    }, [isFetching]);

    if (!cloudStorage && !isInitialized) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!cloudStorage) {
        return (
            <Result
                className='cvat-not-found'
                status='404'
                title={`Sorry, but the cloud storage #${cloudStorageId} was not found`}
                subTitle='Please, be sure id you requested exists and you have appropriate permissions'
            />
        );
    }

    return (
        <Row justify='center' align='top' className='cvat-update-cloud-storage-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>{`Update cloud storage #${cloudStorageId}`}</Text>
                <CreateCloudStorageForm cloudStorage={cloudStorage} />
            </Col>
        </Row>
    );
}
