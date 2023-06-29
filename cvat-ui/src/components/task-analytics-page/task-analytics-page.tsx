// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { LeftOutlined } from '@ant-design/icons/lib/icons';
import { useIsMounted } from 'utils/hooks';
import { Task } from 'reducers';
import { Job, getCore } from 'cvat-core-wrapper';
import TaskQualityComponent from './quality/task-quality-component';

const core = getCore();

function TaskAnalyticsPage(): JSX.Element {
    const [fetchingTask, setFetchingTask] = useState(true);
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const isMounted = useIsMounted();

    const history = useHistory();

    const id = +useParams<{ id: string }>().id;

    const receieveTask = (): void => {
        if (Number.isInteger(id)) {
            core.tasks.get({ id })
                .then(([task]: Task[]) => {
                    if (isMounted() && task) {
                        setTaskInstance(task);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not receive the requested task from the server',
                            description: error.toString(),
                        });
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetchingTask(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not receive the requested task from the server',
                description: `Requested task id "${id}" is not valid`,
            });
            setFetchingTask(false);
        }
    };

    const onJobUpdate = useCallback((job: Job): void => {
        setFetchingTask(true);
        job.save().then(() => {
            if (isMounted()) {
                receieveTask();
            }
        }).catch((error: Error) => {
            if (isMounted()) {
                notification.error({
                    message: 'Could not update the job',
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (isMounted()) {
                setFetchingTask(false);
            }
        });
    }, [notification]);

    useEffect((): void => {
        receieveTask();
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
                        <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
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
                        <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                            <Col className='cvat-task-analytics-title'>
                                <Title
                                    level={4}
                                    className='cvat-text-color'
                                >
                                    {taskInstance.name}
                                </Title>
                                <Text
                                    type='secondary'
                                >
                                    {`#${taskInstance.id}`}
                                </Text>
                            </Col>
                            <Tabs type='card'>
                                <Tabs.TabPane
                                    tab={(
                                        <span>
                                            <Text>Quality</Text>
                                        </span>
                                    )}
                                    key='quality'
                                >
                                    <TaskQualityComponent task={taskInstance} onJobUpdate={onJobUpdate} />
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
