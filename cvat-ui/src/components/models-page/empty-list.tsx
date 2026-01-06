// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

import config from 'config';

export default function EmptyListComponent(): JSX.Element {
    return (
        <div className='cvat-empty-models-list'>
            <Empty
                description={(
                    <div>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>暂无已部署的模型...</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>要自动标注您的任务</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>请使用 </Text>
                                <a href={`${config.NUCLIO_GUIDE}`}>nuclio</a>
                                <Text type='secondary'> 部署模型</Text>
                            </Col>
                        </Row>
                    </div>
                )}
            />
        </div>
    );
}
