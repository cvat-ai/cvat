// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Icon,
} from 'antd';

import { EmptyTasksIcon } from 'icons';

export default function EmptyListComponent(): JSX.Element {
    return (
        <div className='cvat-empty-tasks-list'>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Icon className='cvat-empty-tasks-icon' component={EmptyTasksIcon} />
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text strong>No tasks created yet ...</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text type='secondary'>To get started with your annotation project</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Link to='/tasks/create'>create a new task</Link>
                </Col>
            </Row>
        </div>
    );
}
