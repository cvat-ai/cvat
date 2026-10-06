// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Table from 'antd/lib/table';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore, Task } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { fetchTask } from 'utils/fetch';
import ResourceLink from 'components/common/resource-link';

import './styles.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const core = getCore();
const CHART_TOP_N = 25;

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

    const chartRows = useMemo(
        () => [...counts]
            .filter((row) => row.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, CHART_TOP_N),
        [counts],
    );

    const chartData = useMemo(() => ({
        labels: chartRows.map((row) => row.label),
        datasets: [
            {
                label: 'Annotations',
                data: chartRows.map((row) => row.count),
                backgroundColor: 'rgba(24, 144, 255, 0.65)',
                borderColor: 'rgba(24, 144, 255, 1)',
                borderWidth: 1,
            },
        ],
    }), [chartRows]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: chartRows.length
                    ? `Top ${chartRows.length} classes by annotation count`
                    : 'No annotations to chart',
            },
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 60,
                    minRotation: 45,
                    autoSkip: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
            },
        },
    }), [chartRows.length]);

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
                    <div className='cvat-class-counts-chart'>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
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
