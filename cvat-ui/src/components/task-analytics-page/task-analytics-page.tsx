// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import { useHistory, useParams } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import { Task } from 'reducers';
import { notification } from 'antd';
import { getCore } from 'cvat-core-wrapper';
import { LeftOutlined } from '@ant-design/icons/lib/icons';
import TaskQualityComponent from './quality/task-quality-component';

const core = getCore();

function TaskAnalyticsPage(): JSX.Element {
    const [fetchingTask, setFetchingTask] = useState(true);
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);

    const history = useHistory();

    const id = +useParams<{ id: string }>().id;
    useEffect((): void => {
        if (Number.isInteger(id)) {
            core.tasks.get({ id })
                .then(([task]: Task[]) => {
                    if (task) {
                        setTaskInstance(task);
                    }
                }).catch((error: Error) => {
                    notification.error({
                        message: 'Could not fetch requested task from the server',
                        description: error.toString(),
                    });
                }).finally(() => {
                    setFetchingTask(false);
                });
        } else {
            notification.error({
                message: 'Could not receive the requested task from the server',
                description: `Requested task id "${id}" is not valid`,
            });
            setFetchingTask(false);
        }
    }, []);
    return (
        <div className='cvat-task-analytics-page'>
            {
                fetchingTask ? (
                    <div className='cvat-create-job-loding'>
                        <Spin size='large' className='cvat-spinner' />
                    </div>
                ) : (
                    <Row
                        justify='center'
                        align='top'
                        className='cvat-analytics-wrapper'
                    >
                        <Col md={22} lg={18} xl={16} xxl={14} className='cvat-task-top-bar'>
                            <Button
                                className='cvat-back-to-task-button'
                                onClick={() => history.push(`/tasks/${taskInstance.id}`)}
                                type='link'
                                size='large'
                            >
                                <LeftOutlined />
                                Back to task
                            </Button>
                        </Col>
                        <Col md={22} lg={18} xl={16} xxl={14} className='cvat-analytics-inner'>
                            <Tabs type='card'>
                                <Tabs.TabPane
                                    tab={(
                                        <span>
                                            <Text>Quality</Text>
                                        </span>
                                    )}
                                    key='quality'
                                >
                                    <TaskQualityComponent task={taskInstance} />
                                </Tabs.TabPane>
                            </Tabs>
                        </Col>
                    </Row>
                )
            }
        </div>
    );
}

export default React.memo(TaskAnalyticsPage);
