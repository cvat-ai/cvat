// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import Card from 'antd/lib/card';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Empty from 'antd/lib/empty';
import Tag from 'antd/lib/tag';
import { LoadingOutlined } from '@ant-design/icons';

import ClassCountsChart from './class-counts-chart';
import useClassCountsSocket, { ConnectionStatus } from './use-class-counts-socket';

function StatusTag({ status }: { status: ConnectionStatus }): JSX.Element | null {
    switch (status) {
        case 'live':
            return <Tag color='success'>Live</Tag>;
        case 'connecting':
            return <Tag icon={<LoadingOutlined />} color='processing'>Connecting...</Tag>;
        case 'reconnecting':
            return <Tag icon={<LoadingOutlined />} color='warning'>Reconnecting...</Tag>;
        case 'error':
            return <Tag color='error'>Disconnected</Tag>;
        default:
            return null;
    }
}

export default function ClassAnalyticsPageComponent(): JSX.Element {
    const [taskId, setTaskId] = useState<number | null>(null);
    const {
        status, counts, error, connect,
    } = useClassCountsSocket();

    const handleConnect = (): void => {
        if (taskId) connect(taskId);
    };

    let content: JSX.Element;
    if (status === 'idle') {
        content = (
            <div className='cvat-class-analytics-status-wrapper'>
                <Empty description={(
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>Enter a task ID to see class-wise image counts</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>
                                    Updates live as annotations are added, edited, or removed
                                </Text>
                            </Col>
                        </Row>
                    </>
                )}
                />
            </div>
        );
    } else if (counts) {
        content = Object.keys(counts).length ? (
            <div className='cvat-class-analytics-chart-wrapper'>
                {status === 'reconnecting' && (
                    <Alert
                        className='cvat-class-analytics-stale-banner'
                        type='warning'
                        showIcon
                        message='Connection lost, reconnecting... the chart below may be out of date'
                    />
                )}
                <ClassCountsChart counts={counts} />
            </div>
        ) : (
            <div className='cvat-class-analytics-status-wrapper'>
                <Empty description='This task has no labels' />
            </div>
        );
    } else if (status === 'error') {
        content = (
            <div className='cvat-class-analytics-status-wrapper'>
                <Alert type='error' message='Could not load class counts' description={error} showIcon />
            </div>
        );
    } else {
        // 'connecting' or 'reconnecting' with no data received yet
        content = (
            <div className='cvat-class-analytics-status-wrapper'>
                <Spin size='large' tip={status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'} />
            </div>
        );
    }

    return (
        <div className='cvat-class-analytics-page'>
            <Card className='cvat-class-analytics-form-card'>
                <Row justify='space-between' align='middle' gutter={[8, 8]}>
                    <Col xs={24} sm='auto'>
                        <Title level={4}>Class-wise image counts</Title>
                    </Col>
                    <Col xs={24} sm='auto' className='cvat-class-analytics-status-col'>
                        <StatusTag status={status} />
                    </Col>
                </Row>
                <Row gutter={[8, 8]} align='middle'>
                    <Col>
                        <InputNumber
                            className='cvat-class-analytics-task-id-input'
                            placeholder='Task ID'
                            min={1}
                            precision={0}
                            value={taskId}
                            onChange={(value: number | null) => setTaskId(value)}
                            onPressEnter={handleConnect}
                        />
                    </Col>
                    <Col>
                        <Button
                            className='cvat-class-analytics-connect-button'
                            type='primary'
                            disabled={!taskId}
                            loading={status === 'connecting'}
                            onClick={handleConnect}
                        >
                            Show counts
                        </Button>
                    </Col>
                </Row>
            </Card>
            <div className='cvat-class-analytics-content'>
                {content}
            </div>
        </div>
    );
}
