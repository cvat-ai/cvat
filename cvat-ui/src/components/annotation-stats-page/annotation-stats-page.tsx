// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import {
    Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const core = getCore();

const BAR_HEIGHT_PX = 22;

interface LabelCount {
    id: number;
    name: string;
    color: string;
    count: number;
}

interface AnnotationStats {
    task_id: number;
    total: number;
    labels: LabelCount[];
}

type FetchState =
    { status: 'loading' } |
    { status: 'error'; message: string } |
    { status: 'ready'; stats: AnnotationStats };

function AnnotationStatsChart({ labels }: { labels: LabelCount[] }): JSX.Element {
    const sorted = [...labels].sort((a, b) => b.count - a.count);
    return (
        <div style={{ height: sorted.length * BAR_HEIGHT_PX + 40 }}>
            <Bar
                data={{
                    labels: sorted.map((label) => label.name),
                    datasets: [{
                        label: 'Objects',
                        data: sorted.map((label) => label.count),
                        backgroundColor: sorted.map((label) => label.color || '#1890ff'),
                    }],
                }}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    animation: false,
                    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
            />
        </div>
    );
}

function AnnotationStatsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const [state, setState] = useState<FetchState>({ status: 'loading' });

    const fetchStats = useCallback(async () => {
        setState({ status: 'loading' });
        try {
            const response = await core.server.request<{ data: AnnotationStats }>(
                `${core.config.backendAPI}/annotation-stats/${tid}`, { method: 'GET' },
            );
            setState({ status: 'ready', stats: response.data });
        } catch (error: unknown) {
            setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }, [tid]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    let content: JSX.Element;
    if (state.status === 'loading') {
        content = <CVATLoadingSpinner />;
    } else if (state.status === 'error') {
        content = (
            <Result
                status='error'
                title='Could not load annotation counts'
                subTitle={state.message}
                extra={<Button type='primary' onClick={fetchStats}>Retry</Button>}
            />
        );
    } else if (state.stats.total === 0) {
        content = <Empty description='This task has no annotations yet' />;
    } else {
        content = (
            <>
                <Text strong>{`${state.stats.total} objects across ${state.stats.labels.length} labels`}</Text>
                <AnnotationStatsChart labels={state.stats.labels} />
            </>
        );
    }

    return (
        <div className='cvat-annotation-stats-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
            <Row justify='center' className='cvat-annotation-stats-inner-wrapper'>
                <Col span={22} xl={18} xxl={14} className='cvat-annotation-stats-inner'>
                    <Text className='cvat-title'>{`Annotations per label — task #${tid}`}</Text>
                    {content}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationStatsPage);
