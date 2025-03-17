// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { LeftOutlined, MoreOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import TaskActionsComponent from 'components/tasks-page/actions-menu';

import { Task } from 'cvat-core-wrapper';

interface DetailsComponentProps {
    taskInstance: Task;
}

export default function DetailsComponent(props: DetailsComponentProps): JSX.Element {
    const { taskInstance } = props;
    const history = useHistory();

    return (
        <Row className='cvat-task-top-bar' justify='space-between' align='middle'>
            <Col>
                {taskInstance.projectId ? (
                    <Button
                        className='cvat-back-to-project-button'
                        onClick={() => history.push(`/projects/${taskInstance.projectId}`)}
                        type='link'
                        size='large'
                    >
                        <LeftOutlined />
                        Back to project
                    </Button>
                ) : (
                    <Button
                        className='cvat-back-to-tasks-button'
                        onClick={() => history.push('/tasks')}
                        type='link'
                        size='large'
                    >
                        <LeftOutlined />
                        Back to tasks
                    </Button>
                )}
            </Col>
            <Col>
                <TaskActionsComponent
                    taskInstance={taskInstance}
                    triggerElement={(
                        <Button size='middle' className='cvat-task-page-actions-button'>
                            <Text className='cvat-text-color'>Actions</Text>
                            <MoreOutlined className='cvat-menu-icon' />
                        </Button>
                    )}
                />
            </Col>
        </Row>
    );
}
