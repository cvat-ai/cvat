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
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import Space from 'antd/lib/space';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore, ServerError } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const core = getCore();

const CHART_HEIGHT = 480;

type Measure = 'count' | 'images';

const measureTitles: Record<Measure, string> = {
    count: 'Annotations',
    images: 'Images containing the class',
};

const getChartOptions = (measure: Measure): ChartOptions<'bar'> => ({
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
            ticks: { precision: 0 },
            grid: { color: '#f0f0f0' },
            title: { display: true, text: measureTitles[measure] },
        },
    },
});

const columns = [
    { title: 'Class', dataIndex: 'name' },
    { title: 'Annotations', dataIndex: 'count' },
    { title: 'Images', dataIndex: 'images' },
];

interface ClassCount {
    name: string;
    count: number;
    images: number;
}

interface Failure {
    status: 'warning' | '403' | '404';
    title: string;
    text: string;
    canRetry: boolean;
}

function describeFailure(reason: unknown, taskId: number): Failure {
    const code = reason instanceof ServerError ? reason.code : 0;
    if (code === 404) {
        return {
            status: '404',
            title: `Task #${taskId} was not found`,
            text: 'It may have been deleted, or the address may be wrong.',
            canRetry: false,
        };
    }

    if (code === 403) {
        return {
            status: '403',
            title: 'You do not have access to this task',
            text: 'Ask the task owner to share it with you.',
            canRetry: false,
        };
    }

    return {
        status: 'warning',
        title: 'The class counts could not be loaded',
        text: 'The server did not answer. This is usually temporary, and nothing in the task was changed.',
        canRetry: true,
    };
}

function ClassCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [counts, setCounts] = useState<ClassCount[]>([]);
    const [fetching, setFetching] = useState(true);
    const [failure, setFailure] = useState<Failure | null>(null);
    const [jobs, setJobs] = useState<number[]>([]);
    const [jobId, setJobId] = useState<number | null>(null);
    const [measure, setMeasure] = useState<Measure>('count');

    const load = useCallback(() => {
        setFetching(true);
        core.server.request<{ data: { jobs: number[], counts: ClassCount[] } }>(
            `${core.config.backendAPI}/tasks/${taskId}/class-counts`,
            { method: 'GET', params: jobId === null ? {} : { job: jobId } },
        ).then((response) => {
            setJobs(response.data.jobs);
            setCounts(response.data.counts);
            setFailure(null);
        }).catch((reason: unknown) => {
            setFailure(describeFailure(reason, taskId));
        }).finally(() => {
            setFetching(false);
        });
    }, [taskId, jobId]);

    useEffect(load, [load]);

    let content = null;
    if (failure !== null) {
        content = (
            <Result
                className='cvat-class-counts-error'
                status={failure.status}
                title={failure.title}
                subTitle={failure.text}
                extra={failure.canRetry && (
                    <Button type='primary' loading={fetching} onClick={load}>Try again</Button>
                )}
            />
        );
    } else if (fetching) {
        content = <CVATLoadingSpinner size='large' />;
    } else if (!counts.length) {
        content = (
            <Empty
                className='cvat-class-counts-empty'
                description={jobId === null ?
                    'No annotations yet in this task' : `No annotations yet in job #${jobId}`}
            />
        );
    } else {
        const sorted = [...counts].sort((a, b) => b[measure] - a[measure]);
        content = (
            <>
                <div className='cvat-class-counts-chart' style={{ height: CHART_HEIGHT, marginTop: 16 }}>
                    <Bar
                        options={getChartOptions(measure)}
                        data={{
                            labels: sorted.map((item) => item.name),
                            datasets: [{
                                label: measureTitles[measure],
                                data: sorted.map((item) => item[measure]),
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
                    dataSource={sorted}
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
                    { jobs.length > 0 && (
                        <Space>
                            <Select
                                className='cvat-class-counts-job-select'
                                value={jobId ?? 0}
                                onChange={(value: number) => setJobId(value || null)}
                                options={[
                                    { value: 0, label: 'Whole task' },
                                    ...jobs.map((id) => ({ value: id, label: `Job #${id}` })),
                                ]}
                            />
                            <Radio.Group
                                className='cvat-class-counts-measure'
                                value={measure}
                                onChange={(event) => setMeasure(event.target.value)}
                            >
                                <Radio.Button value='count'>Count annotations</Radio.Button>
                                <Radio.Button value='images'>Count images</Radio.Button>
                            </Radio.Group>
                        </Space>
                    ) }
                    { content }
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ClassCountsPage);
