// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Table from 'antd/lib/table';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';

import { getCore, Task } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { fetchTask } from 'utils/fetch';
import ResourceLink from 'components/common/resource-link';

import './styles.scss';

const core = getCore();

interface ClassCountRow {
    label: string;
    count: number;
}

interface ClassCountsResponse {
    task_id: number;
    counts: ClassCountRow[];
}

function ClassCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [task, setTask] = useState<Task | null>(null);
    const [counts, setCounts] = useState<ClassCountRow[]>([]);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async (): Promise<void> => {
            try {
                setFetching(true);
                setError(null);

                const [fetchedTask, response] = await Promise.all([
                    fetchTask(taskId),
                    core.server.request(`/api/test/tasks/${taskId}/class-counts`, {
                        method: 'GET',
                    }),
                ]);

                if (cancelled) {
                    return;
                }

                const payload = (response?.data ?? response) as ClassCountsResponse;
                setTask(fetchedTask);
                setCounts(Array.isArray(payload?.counts) ? payload.counts : []);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                if (!cancelled) {
                    setFetching(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [taskId]);

    const backNavigation = (
        <Row justify='center'>
            <Col span={22} xl={18} xxl={14}>
                <GoBackButton />
            </Col>
        </Row>
    );

    if (error) {
        return (
            <div className='cvat-class-counts-page'>
                <div className='cvat-class-counts-page-error'>
                    <Result
                        status='error'
                        title='Could not load class counts'
                        subTitle={error.message}
                        extra={backNavigation}
                    />
                </div>
            </div>
        );
    }

    if (fetching) {
        return (
            <div className='cvat-class-counts-page'>
                <div className='cvat-class-counts-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    const total = counts.reduce((sum, row) => sum + row.count, 0);

    return (
        <div className='cvat-class-counts-page'>
            {backNavigation}
            <Row justify='center' className='cvat-class-counts-inner-wrapper'>
                <Col span={22} xl={18} xxl={14} className='cvat-class-counts-inner'>
                    <Title level={4} className='cvat-text-color'>
                        {'Class counts for '}
                        {task ? <ResourceLink resource={task} /> : `task #${taskId}`}
                    </Title>
                    <Text type='secondary'>
                        {`${counts.length} classes · ${total} annotations total`}
                    </Text>
                    <Table
                        className='cvat-class-counts-table'
                        rowKey='label'
                        size='middle'
                        pagination={{ pageSize: 20, hideOnSinglePage: true }}
                        dataSource={counts}
                        columns={[
                            {
                                title: 'Class',
                                dataIndex: 'label',
                                key: 'label',
                                sorter: (a: ClassCountRow, b: ClassCountRow) => (
                                    a.label.localeCompare(b.label)
                                ),
                            },
                            {
                                title: 'Annotations',
                                dataIndex: 'count',
                                key: 'count',
                                width: 160,
                                defaultSortOrder: 'descend',
                                sorter: (a: ClassCountRow, b: ClassCountRow) => a.count - b.count,
                            },
                        ]}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ClassCountsPage);
