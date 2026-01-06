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
                    <Text strong>没有结果匹配您的搜索...</Text>
                ) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>尚未连接任何云存储...</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>要开始使用云存储，请</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/cloudstorages/create'>连接一个新的</Link>
                            </Col>
                        </Row>
                    </>
                )}
                image={notFound ? Empty.PRESENTED_IMAGE_DEFAULT : <CloudOutlined className='cvat-empty-cloud-storages-list-icon' />}
            />
        </div>
    );
}
