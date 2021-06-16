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
import { CloudStoragesQuery } from 'reducers/interfaces';

interface Props {
    onSearch(query: CloudStoragesQuery): void;
    query: CloudStoragesQuery;
}

export default function StoragesTopBar(props: Props): JSX.Element {
    const { onSearch, query } = props;
    const history = useHistory();

    return (
        <Row justify='space-between' align='middle' className='cvat-cloud-storages-list-top-bar'>
            <Col md={11} lg={9} xl={9} xxl={9}>
                <Text className='cvat-title'>Cloud Storages</Text>
                <SearchField instance='cloudstorage' onSearch={onSearch} query={query} />
            </Col>
            <Col md={{ span: 11 }} lg={{ span: 9 }} xl={{ span: 9 }} xxl={{ span: 9 }}>
                <Button
                    size='large'
                    className='cvat-attach-cloud-storage-button'
                    type='primary'
                    onClick={(): void => history.push('/cloudstorages/create')}
                    icon={<PlusOutlined />}
                >
                    Attach a new storage
                </Button>
            </Col>
        </Row>
    );
}
