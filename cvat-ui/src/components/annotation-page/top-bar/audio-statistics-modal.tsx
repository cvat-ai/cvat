// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';

import { AudioRegion, CombinedState, Workspace } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { showStatistics } from 'actions/annotation-actions';
import { formatTimeShort } from 'utils/format-audio-time';

interface StateToProps {
    visible: boolean;
    workspace: Workspace;
    bugTracker: string | null;
    assignee: string;
    duration: number;
    regions: AudioRegion[];
    labels: Label[];
    hasUnsavedChanges: boolean;
    audioUrl: string | null;
}

interface DispatchToProps {
    closeStatistics(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            workspace,
            statistics: { visible },
            job: {
                instance,
                labels,
            },
            audioPlayer: {
                duration,
                regions,
                hasUnsavedChanges,
                audioUrl,
            },
        },
    } = state;

    return {
        visible,
        workspace,
        bugTracker: instance?.bugTracker ?? null,
        assignee: instance?.assignee?.username || 'Nobody',
        duration,
        regions,
        labels,
        hasUnsavedChanges,
        audioUrl,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        closeStatistics(): void {
            dispatch(showStatistics(false));
        },
    };
}

interface RegionStats {
    count: number;
    totalDuration: number;
    locked: number;
    hidden: number;
}

function emptyStats(): RegionStats {
    return {
        count: 0, totalDuration: 0, locked: 0, hidden: 0,
    };
}

function AudioStatisticsModalComponent(props: StateToProps & DispatchToProps): JSX.Element | null {
    const {
        visible,
        workspace,
        assignee,
        bugTracker,
        duration,
        regions,
        labels,
        hasUnsavedChanges,
        audioUrl,
        closeStatistics,
    } = props;

    if (workspace !== Workspace.AUDIO) {
        return null;
    }

    const labelById = new Map<number, Label>();
    labels.forEach((l) => {
        if (typeof l.id === 'number') labelById.set(l.id, l);
    });

    const perLabel = new Map<string, RegionStats>();
    const totals = emptyStats();
    regions.forEach((r) => {
        const labelName = (r.labelId != null && labelById.get(r.labelId)?.name) || 'Unlabeled';
        const stats = perLabel.get(labelName) || emptyStats();
        stats.count += 1;
        stats.totalDuration += Math.max(0, r.end - r.start);
        if (r.locked) stats.locked += 1;
        if (r.hidden) stats.hidden += 1;
        perLabel.set(labelName, stats);

        totals.count += 1;
        totals.totalDuration += Math.max(0, r.end - r.start);
        if (r.locked) totals.locked += 1;
        if (r.hidden) totals.hidden += 1;
    });

    const coverageOf = (d: number): string => {
        if (!duration || duration <= 0) return '—';
        return `${((d / duration) * 100).toFixed(1)}%`;
    };

    const rows = Array.from(perLabel.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, stats]) => ({
            key: label,
            label,
            count: stats.count,
            totalDuration: formatTimeShort(stats.totalDuration),
            coverage: coverageOf(stats.totalDuration),
            locked: stats.locked,
            hidden: stats.hidden,
        }));

    rows.push({
        key: '___total',
        label: 'Total',
        count: totals.count,
        totalDuration: formatTimeShort(totals.totalDuration),
        coverage: coverageOf(totals.totalDuration),
        locked: totals.locked,
        hidden: totals.hidden,
    });

    const columns = [
        {
            title: <Text strong>Label</Text>,
            dataIndex: 'label',
            key: 'label',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: <Text strong>Regions</Text>,
            dataIndex: 'count',
            key: 'count',
        },
        {
            title: <Text strong>Total duration</Text>,
            dataIndex: 'totalDuration',
            key: 'totalDuration',
        },
        {
            title: <Text strong>Coverage</Text>,
            dataIndex: 'coverage',
            key: 'coverage',
        },
        {
            title: <Text strong>Locked</Text>,
            dataIndex: 'locked',
            key: 'locked',
        },
        {
            title: <Text strong>Hidden</Text>,
            dataIndex: 'hidden',
            key: 'hidden',
        },
    ];

    return (
        <Modal
            cancelButtonProps={{ style: { display: 'none' } }}
            okButtonProps={{ style: { width: 100 } }}
            onOk={closeStatistics}
            width={800}
            open={visible}
            closable={false}
            className='cvat-audio-statistics-modal'
        >
            <div className='cvat-job-info-modal-window'>
                <Row justify='start'>
                    <Col>
                        <Text className='cvat-text'>Overview</Text>
                    </Col>
                </Row>
                <Row justify='start'>
                    <Col span={6}>
                        <Text strong className='cvat-text'>Assignee</Text>
                        <Text className='cvat-text'>{assignee}</Text>
                    </Col>
                    <Col span={6}>
                        <Text strong className='cvat-text'>Duration</Text>
                        <Text className='cvat-text'>
                            {duration > 0 ? formatTimeShort(duration) : '—'}
                        </Text>
                    </Col>
                    <Col span={6}>
                        <Text strong className='cvat-text'>Regions</Text>
                        <Text className='cvat-text'>{totals.count}</Text>
                    </Col>
                    <Col span={6}>
                        <Text strong className='cvat-text'>Unsaved changes</Text>
                        <Text className='cvat-text'>{hasUnsavedChanges ? 'Yes' : 'No'}</Text>
                    </Col>
                </Row>
                {!!audioUrl && (
                    <Row justify='start'>
                        <Col span={24}>
                            <Text strong className='cvat-text'>Source</Text>
                            <Text className='cvat-text' ellipsis={{ tooltip: audioUrl }}>
                                {audioUrl}
                            </Text>
                        </Col>
                    </Row>
                )}
                {!!bugTracker && (
                    <Row justify='start' className='cvat-job-info-bug-tracker'>
                        <Col>
                            <Text strong className='cvat-text'>Bug tracker</Text>
                            <a href={bugTracker}>{bugTracker}</a>
                        </Col>
                    </Row>
                )}
                <Row justify='space-around' className='cvat-job-info-statistics'>
                    <Col span={24}>
                        <Text className='cvat-text'>Annotations statistics</Text>
                        <Table
                            scroll={{ y: 400 }}
                            bordered
                            pagination={false}
                            columns={columns}
                            dataSource={rows}
                        />
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioStatisticsModalComponent);
