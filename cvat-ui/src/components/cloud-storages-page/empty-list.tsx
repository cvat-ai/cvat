// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Empty from 'antd/lib/empty';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import { CloudOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

interface Props {
    notFound: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { notFound } = props;

    return (
        <div className='cvat-empty-cloud-storages-list'>
            <Empty
                description={notFound ? (
                    <Text strong>No results matched your search...</Text>
                ) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>No cloud storages attached yet...</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>To get started with your cloud storage</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/cloudstorages/create'>attach a new one</Link>
                            </Col>
                        </Row>
                    </>
                )}
                image={notFound ? Empty.PRESENTED_IMAGE_DEFAULT : <CloudOutlined className='cvat-empty-cloud-storages-list-icon' />}
            />
        </div>
    );
}
