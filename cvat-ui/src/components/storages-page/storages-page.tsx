// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import StoragesListComponent from './storages-list';
import EmptyListComponent from './empty-storages-list';
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
                {totalStorages ? <StoragesListComponent /> : <EmptyListComponent notFound={!!searchRequest} />}
            </Col>
        </Row>
    );
}
