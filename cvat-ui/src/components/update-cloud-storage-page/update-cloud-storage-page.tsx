// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';

import { CombinedState } from 'reducers';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import CreateCloudStorageForm from 'components/create-cloud-storage-page/cloud-storage-form';

interface ParamType {
    id: string;
}

export default function UpdateCloudStoragePageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const cloudStorageId = +useParams<ParamType>().id;
    const [requested, setRequested] = useState(false);
    const {
        isFetching,
        isInitialized,
        cloudStorage,
    } = useSelector((state: CombinedState) => ({
        isFetching: state.cloudStorages.fetching,
        isInitialized: state.cloudStorages.initialized,
        cloudStorage: state.cloudStorages.current.find((_cloudStorage) => _cloudStorage.id === cloudStorageId),
    }), shallowEqual);

    useEffect(() => {
        if (!cloudStorage && !requested && !isFetching) {
            setRequested(true);
            dispatch(getCloudStoragesAsync({ id: cloudStorageId }));
        }
    }, [requested, cloudStorage, isFetching]);

    if (!cloudStorage && !isInitialized) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!cloudStorage) {
        return (
            <Result
                className='cvat-not-found'
                status='404'
                title='Sorry, but the requested cloud storage was not found'
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
