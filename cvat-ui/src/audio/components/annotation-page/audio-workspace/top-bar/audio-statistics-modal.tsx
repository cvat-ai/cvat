// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Modal from 'antd/lib/modal';
import Spin from 'antd/lib/spin';
import Text from 'antd/lib/typography/Text';

import { CombinedState, Workspace } from 'reducers';
import { showStatistics } from 'actions/annotation-actions';
import { formatMilliseconds } from 'audio/utils/format-audio-time';

interface StateToProps {
    visible: boolean;
    collecting: boolean;
    data: any;
    workspace: Workspace;
    bugTracker: string | null;
    assignee: string;
    duration: number;
}

interface DispatchToProps {
    closeStatistics(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            workspace,
            statistics: { visible, collecting, data },
            job: {
                instance,
            },
        },
        audio: {
            player: {
                duration,
            },
        },
    } = state;

    return {
        visible,
        collecting,
        data,
        workspace,
        bugTracker: instance?.bugTracker ?? null,
        assignee: instance?.assignee?.username || 'Nobody',
        duration,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        closeStatistics(): void {
            dispatch(showStatistics(false));
        },
    };
}

function formatCoverage(value: number): string {
    return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function AudioStatisticsModalComponent(props: StateToProps & DispatchToProps): JSX.Element | null {
    const {
        collecting,
        data,
        visible,
        workspace,
        assignee,
        bugTracker,
        duration,
        closeStatistics,
    } = props;

    if (workspace !== Workspace.AUDIO) {
        return null;
    }

    const baseProps = {
        cancelButtonProps: { style: { display: 'none' } },
        okButtonProps: { style: { width: 100 } },
        onOk: closeStatistics,
        width: 800,
        open: visible,
        closable: false,
        className: 'cvat-audio-statistics-modal',
    };

    if (collecting || !data) {
        return (
            <Modal {...baseProps}>
                <Spin style={{ margin: '0 50%' }} />
            </Modal>
        );
    }

    const rows = Object.keys(data.label)
        .sort((a, b) => a.localeCompare(b))
        .map((label: string) => ({
            key: label,
            label,
            count: data.label[label].interval.count,
            totalDuration: formatMilliseconds(data.label[label].interval.duration),
            coverage: formatCoverage(data.label[label].interval.coverage),
        }));

    rows.push({
        key: '___total',
        label: 'Total',
        count: data.total.interval.count,
        totalDuration: formatMilliseconds(data.total.interval.duration),
        coverage: formatCoverage(data.total.interval.coverage),
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
    ];

    return (
        <Modal {...baseProps}>
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
                            {duration > 0 ? formatMilliseconds(duration * 1000) : '—'}
                        </Text>
                    </Col>
                    <Col span={6}>
                        <Text strong className='cvat-text'>Regions</Text>
                        <Text className='cvat-text'>{data.total.interval.count}</Text>
                    </Col>
                </Row>
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
