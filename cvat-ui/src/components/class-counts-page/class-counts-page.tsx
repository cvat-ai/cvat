// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Table from 'antd/lib/table';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const core = getCore();

const CHART_HEIGHT = 480;

const chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: {
            grid: { display: false },
            ticks: {
                autoSkip: false, minRotation: 90, maxRotation: 90, font: { size: 10 },
            },
        },
        y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0' },
            title: { display: true, text: 'Annotations' },
        },
    },
};

const columns = [
    { title: 'Class', dataIndex: 'name' },
    { title: 'Annotations', dataIndex: 'count' },
];

interface ClassCount {
    name: string;
    count: number;
}

function ClassCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [counts, setCounts] = useState<ClassCount[]>([]);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setFetching(true);
        setError(null);
        core.server.request<{ data: { counts: ClassCount[] } }>(
            `${core.config.backendAPI}/tasks/${taskId}/class-counts`, { method: 'GET' },
        ).then((response) => {
            setCounts(response.data.counts);
        }).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Unknown error');
        }).finally(() => {
            setFetching(false);
        });
    }, [taskId]);

    useEffect(load, [load]);

    let content = null;
    if (fetching) {
        content = <CVATLoadingSpinner size='large' />;
    } else if (error !== null) {
        content = (
            <Result
                className='cvat-class-counts-error'
                status='error'
                title='Could not load the class counts'
                subTitle={error}
                extra={<Button type='primary' onClick={load}>Retry</Button>}
            />
        );
    } else if (!counts.length) {
        content = (
            <Empty
                className='cvat-class-counts-empty'
                description='No annotations yet in this task'
            />
        );
    } else {
        content = (
            <>
                <div className='cvat-class-counts-chart' style={{ height: CHART_HEIGHT }}>
                    <Bar
                        options={chartOptions}
                        data={{
                            labels: counts.map((item) => item.name),
                            datasets: [{
                                label: 'Annotations',
                                data: counts.map((item) => item.count),
                                backgroundColor: '#1677ff',
                                categoryPercentage: 1,
                                barPercentage: 0.9,
                            }],
                        }}
                    />
                </div>
                <Table
                    className='cvat-class-counts-table'
                    columns={columns}
                    dataSource={counts}
                    rowKey='name'
                    size='small'
                    pagination={false}
                />
            </>
        );
    }

    return (
        <div className='cvat-class-counts-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    <Title level={4}>{`Annotations per class in task #${taskId}`}</Title>
                    { content }
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ClassCountsPage);
