// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

import config from 'config';

interface Props {
    notFound?: boolean;
}

export default function EmptyListComponent(props: Readonly<Props>): JSX.Element {
    const { notFound = false } = props;

    return (
        <div className='cvat-empty-models-list'>
            <Empty
                image={notFound ? Empty.PRESENTED_IMAGE_SIMPLE : Empty.PRESENTED_IMAGE_DEFAULT}
                description={(
                    notFound ? <Text strong>No models found</Text> : (
                        <div>
                            <Row justify='center' align='middle'>
                                <Col>
                                    <Text strong>No models deployed yet...</Text>
                                </Col>
                            </Row>
                            <Row justify='center' align='middle'>
                                <Col>
                                    <Text type='secondary'>To annotate your tasks automatically</Text>
                                </Col>
                            </Row>
                            <Row justify='center' align='middle'>
                                <Col>
                                    <Text type='secondary'>deploy a model with </Text>
                                    <a href={`${config.NUCLIO_GUIDE}`}>nuclio</a>
                                </Col>
                            </Row>
                        </div>
                    )
                )}
            />
        </div>
    );
}
