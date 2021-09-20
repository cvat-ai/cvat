// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import CreateCloudStorageForm from './cloud-storage-form';

export default function CreateCloudStoragePageComponent(): JSX.Element {
    return (
        <Row justify='center' align='top' className='cvat-attach-cloud-storage-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>Create a cloud storage</Text>
                <CreateCloudStorageForm />
            </Col>
        </Row>
    );
}
