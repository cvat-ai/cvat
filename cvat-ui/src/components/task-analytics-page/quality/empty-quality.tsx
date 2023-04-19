// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import Empty from 'antd/lib/empty';
import { Col, Row } from 'antd/lib/grid';

interface Props {
    taskId: number,
}

function EmptyQualityComponent(props: Props): JSX.Element {
    const { taskId } = props;

    return (
        <div className='cvat-task-quality-page cvat-task-quality-page-empty'>
            <Empty description={(
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>No Ground truth job created yet ...</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>To start viewing quality data</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Link to={`/tasks/${taskId}/jobs/create`}>create a new one</Link>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}

export default React.memo(EmptyQualityComponent);
