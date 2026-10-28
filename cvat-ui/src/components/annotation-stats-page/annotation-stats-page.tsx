// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Switch from 'antd/lib/switch';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import {
    Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import useLiveAnnotationStats, { Connection, LabelCount } from './use-live-annotation-stats';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

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

const CONNECTION_TAGS: Record<Connection, { color: string; text: string }> = {
    connecting: { color: 'default', text: 'Connecting…' },
    live: { color: 'success', text: 'Live' },
    reconnecting: { color: 'warning', text: 'Reconnecting…' },
};

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
    const { state, connection, reload } = useLiveAnnotationStats(tid);
    const [splitByType, setSplitByType] = useState(false);

    let content: JSX.Element;
    if (state.status === 'loading') {
        content = <CVATLoadingSpinner />;
    } else if (state.status === 'error') {
        content = (
            <Result
                status='error'
                title='Could not load annotation counts'
                subTitle={state.message}
                extra={<Button type='primary' onClick={reload}>Retry</Button>}
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
                    <div className='cvat-annotation-stats-summary'>
                        <Text className='cvat-title'>{`Annotations per label — task #${tid}`}</Text>
                        {state.status === 'ready' && (
                            <Tag className='cvat-annotation-stats-connection' color={CONNECTION_TAGS[connection].color}>
                                {CONNECTION_TAGS[connection].text}
                            </Tag>
                        )}
                    </div>
                    {content}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationStatsPage);
