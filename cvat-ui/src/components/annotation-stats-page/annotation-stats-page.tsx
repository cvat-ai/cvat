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
import Switch from 'antd/lib/switch';
import Text from 'antd/lib/typography/Text';
import {
    Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const core = getCore();

const BAR_HEIGHT_PX = 22;

// Each type keeps its colour whichever types a task has, so a colour always means the same type
const TYPE_COLORS: Record<string, string> = {
    polygon: '#2a78d6',
    mask: '#eb6834',
    rectangle: '#1baf7a',
    ellipse: '#eda100',
    points: '#e87ba4',
    polyline: '#008300',
    cuboid: '#6250d6',
    skeleton: '#e34948',
    track: '#8c8c8c',
};

interface LabelCount {
    id: number;
    name: string;
    color: string;
    count: number;
    by_type: Record<string, number>;
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

function AnnotationStatsChart(
    { labels, splitByType }: { labels: LabelCount[]; splitByType: boolean },
): JSX.Element {
    const sorted = [...labels].sort((a, b) => b.count - a.count);
    const presentTypes = Object.keys(TYPE_COLORS)
        .filter((type) => sorted.some((label) => label.by_type[type]));
    const datasets = splitByType ? presentTypes.map((type) => ({
        label: type,
        data: sorted.map((label) => label.by_type[type] ?? 0),
        backgroundColor: TYPE_COLORS[type],
    })) : [{
        label: 'Annotations',
        data: sorted.map((label) => label.count),
        backgroundColor: sorted.map((label) => label.color || TYPE_COLORS.polygon),
    }];

    return (
        <div className='cvat-annotation-stats-chart' style={{ height: sorted.length * BAR_HEIGHT_PX + 60 }}>
            <Bar
                data={{ labels: sorted.map((label) => label.name), datasets }}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: { legend: { display: splitByType, position: 'top' } },
                    scales: {
                        x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
                        y: { stacked: true, ticks: { autoSkip: false } },
                    },
                }}
            />
        </div>
    );
}

function AnnotationStatsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const [state, setState] = useState<FetchState>({ status: 'loading' });
    const [splitByType, setSplitByType] = useState(false);

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
                <div className='cvat-annotation-stats-summary'>
                    <Text strong>{`${state.stats.total} annotations across ${state.stats.labels.length} labels`}</Text>
                    <span>
                        <Switch size='small' checked={splitByType} onChange={setSplitByType} />
                        <Text> Split by shape type</Text>
                    </span>
                </div>
                <AnnotationStatsChart labels={state.stats.labels} splitByType={splitByType} />
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
