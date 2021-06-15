// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { PlusOutlined } from '@ant-design/icons';

import SearchField from 'components/search-field/search-field';

export default function StoragesTopBar(): JSX.Element {
    const history = useHistory();

    const onSearch = (): void => {};
    const query = {};

    return (
        <Row justify='space-between' align='middle' className='cvat-storages-list-top-bar'>
            <Col md={11} lg={9} xl={8} xxl={7}>
                <Text className='cvat-title'>Storages</Text>
                <SearchField onSearch={onSearch} query={query} />
            </Col>
            <Col md={{ span: 11 }} lg={{ span: 9 }} xl={{ span: 9 }} xxl={{ span: 9 }}>
                <Button
                    size='large'
                    className='cvat-attach-storage-button'
                    type='primary'
                    href='/storages?page=1'
                    onClick={(): void => history.push('/storages/create')}
                    icon={<PlusOutlined />}
                >
                    Attach a new storage
                </Button>
            </Col>
        </Row>
    );
}
