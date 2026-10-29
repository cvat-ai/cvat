// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect } from 'react';
import notification from 'antd/lib/notification';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { Task, getCore } from 'cvat-core-wrapper';
import { useInstanceId } from 'utils/hooks';
import { InstanceType } from 'reducers';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import ResourceLink from 'components/common/resource-link';

const core = getCore();

type LabelCounts = Awaited<ReturnType<typeof core.analytics.labelCounts.get>>;

function LabelCountsPage(): JSX.Element {
    const taskId = useInstanceId(InstanceType.TASK);
    const [task, setTask] = useState<Task | null>(null);
    const [labelCounts, setLabelCounts] = useState<LabelCounts | null>(null);
    const [fetching, setFetching] = useState(true);

    const fetchData = async (): Promise<void> => {
        setFetching(true);
        try {
            const [[fetchedTask], fetchedCounts] = await Promise.all([
                core.tasks.get({ id: taskId }),
                core.analytics.labelCounts.get({ taskID: taskId }),
            ]);
            setTask(fetchedTask);
            setLabelCounts(fetchedCounts);
        } catch (error: unknown) {
            notification.error({
                message: 'Could not receive label counts from the server',
                description: error instanceof Error ? error.message : '',
            });
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (Number.isInteger(taskId)) {
            fetchData();
        }
    }, []);

    return (
        <div className='cvat-label-counts-page'>
            <div className='cvat-label-counts-wrapper'>
                <Row justify='center'>
                    <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                        <GoBackButton />
                    </Col>
                </Row>
                <Row justify='center' className='cvat-label-counts-inner-wrapper'>
                    <Col span={22} xl={18} xxl={14} className='cvat-label-counts-inner'>
                        { task && (
                            <Title level={4} className='cvat-text-color cvat-label-counts-header'>
                                {'Label counts for '}
                                <ResourceLink resource={task} />
                            </Title>
                        )}
                        { fetching && <CVATLoadingSpinner /> }
                        { labelCounts && (
                            <div className='cvat-label-counts-list'>
                                <Text strong>{`Total: ${labelCounts.total}`}</Text>
                                { labelCounts.labels.map((label) => (
                                    <div key={label.id} className='cvat-label-counts-item'>
                                        <span
                                            className='cvat-label-counts-color'
                                            style={{ backgroundColor: label.color }}
                                        />
                                        <Text className='cvat-label-counts-name'>{label.name}</Text>
                                        <Text>{label.count}</Text>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default React.memo(LabelCountsPage);
