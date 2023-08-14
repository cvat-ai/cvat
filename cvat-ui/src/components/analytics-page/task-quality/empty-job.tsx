// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';

interface Props {
    taskId: number,
}

function EmptyJobComponent(props: Props): JSX.Element {
    const { taskId } = props;

    return (
        <Col span={24}>
            <Card className='cvat-job-empty-ground-truth-item'>
                <Row justify='space-between' align='middle'>
                    <Col>
                        No Ground Truth job created yet
                    </Col>
                </Row>
                <Row justify='center'>
                    <Col>
                        <Button type='primary'>
                            <Link to={`/tasks/${taskId}/jobs/create`}>Create new</Link>
                        </Button>
                    </Col>
                </Row>
            </Card>
        </Col>
    );
}

export default React.memo(EmptyJobComponent);
