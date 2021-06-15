// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import CloudStoragesListComponent from './cloud-storages-list';
import EmptyCloudStorageListComponent from './empty-cloud-storages-list';
import TopBarComponent from './top-bar';

export default function StoragesPageComponent(): JSX.Element {
    const dimensions = {
        md: 22, lg: 18, xl: 16, xxl: 16,
    };

    // TODO get totalStorages from state, get query from state
    const totalStorages = 0;
    const searchRequest = '';

    return (
        <Row className='cvat-storages-page' justify='center' align='middle'>
            <Col {...dimensions}>
                <TopBarComponent />
                {totalStorages ?
                    <CloudStoragesListComponent /> :
                    <EmptyCloudStorageListComponent notFound={!!searchRequest} />}
            </Col>
        </Row>
    );
}
