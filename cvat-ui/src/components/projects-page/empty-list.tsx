// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

interface Props {
    notFound: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { notFound } = props;

    return (
        <div className='cvat-empty-projects-list'>
            <Empty description={notFound ? (
                <Text strong>没有找到匹配的结果...</Text>
            ) : (
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>暂无项目...</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>开始您的标注项目</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Link to='/projects/create'>创建新项目</Link>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}
