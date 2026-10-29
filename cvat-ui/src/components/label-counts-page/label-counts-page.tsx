// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect } from 'react';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { Task, ServerError, getCore } from 'cvat-core-wrapper';
import { useInstanceId } from 'utils/hooks';
import { InstanceType } from 'reducers';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import ResourceLink from 'components/common/resource-link';
import LabelCountsChart from './label-counts-chart';
import JobFilter from './job-filter';

const core = getCore();

const UNREACHABLE_SERVER_MESSAGE = 'The server could not be reached. Check that CVAT is running and try again.';

type LabelCounts = Awaited<ReturnType<typeof core.analytics.labelCounts.get>>;

function LabelCountsPage(): JSX.Element {
    const taskId = useInstanceId(InstanceType.TASK);
    const [task, setTask] = useState<Task | null>(null);
    const [labelCounts, setLabelCounts] = useState<LabelCounts | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [jobId, setJobId] = useState<number | undefined>(undefined);

    const fetchData = async (): Promise<void> => {
        setFetching(true);
        setError(null);
        setLabelCounts(null);
        try {
            const [[fetchedTask], fetchedCounts] = await Promise.all([
                core.tasks.get({ id: taskId }),
                core.analytics.labelCounts.get({ taskID: taskId, ...(jobId !== undefined && { jobID: jobId }) }),
            ]);
            setTask(fetchedTask);
            setLabelCounts(fetchedCounts);
        } catch (err: unknown) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (Number.isInteger(taskId)) {
            fetchData();
        }
    }, [jobId]);

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
                        { task && (
                            <div className='cvat-label-counts-toolbar'>
                                <JobFilter
                                    jobs={task.jobs}
                                    value={jobId}
                                    disabled={fetching}
                                    onChange={setJobId}
                                />
                                { !fetching && labelCounts && labelCounts.total > 0 && (
                                    <Text strong>{`Total: ${labelCounts.total} annotations`}</Text>
                                )}
                            </div>
                        )}
                        { fetching && <CVATLoadingSpinner /> }
                        { !fetching && error && (
                            <Result
                                status='error'
                                title='Could not load label counts'
                                subTitle={error instanceof ServerError ? error.message : UNREACHABLE_SERVER_MESSAGE}
                                extra={<Button type='primary' onClick={fetchData}>Retry</Button>}
                            />
                        )}
                        { !fetching && labelCounts && labelCounts.total === 0 && (
                            <Empty
                                className='cvat-label-counts-empty'
                                description={<Text strong>No annotations in this task yet</Text>}
                            />
                        )}
                        { !fetching && labelCounts && labelCounts.total > 0 && (
                            <div className='cvat-label-counts-chart-scroll'>
                                <LabelCountsChart labels={labelCounts.labels} />
                            </div>
                        )}
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default React.memo(LabelCountsPage);
