// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tooltip from 'antd/lib/tooltip';
import Select from 'antd/lib/select';
import Table from 'antd/lib/table';
import Modal from 'antd/lib/modal';
import Spin from 'antd/lib/spin';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';

interface Props {
    collecting: boolean;
    data: any;
    visible: boolean;
    assignee: string;
    startFrame: number;
    stopFrame: number;
    bugTracker: string;
    jobStatus: string;
    savingJobStatus: boolean;
    closeStatistics(): void;
    changeJobStatus(status: string): void;
}

export default function StatisticsModalComponent(props: Props): JSX.Element {
    const {
        collecting,
        data,
        visible,
        jobStatus,
        assignee,
        startFrame,
        stopFrame,
        bugTracker,
        closeStatistics,
        changeJobStatus,
        savingJobStatus,
    } = props;

    const baseProps = {
        cancelButtonProps: { style: { display: 'none' } },
        okButtonProps: { style: { width: 100 } },
        onOk: closeStatistics,
        width: 1000,
        visible,
        closable: false,
    };

    if (collecting || !data) {
        return (
            <Modal {...baseProps}>
                <Spin style={{ margin: '0 50%' }} />
            </Modal>
        );
    }

    const rows = Object.keys(data.label).map((key: string) => ({
        key,
        label: key,
        rectangle: `${data.label[key].rectangle.shape} / ${data.label[key].rectangle.track}`,
        polygon: `${data.label[key].polygon.shape} / ${data.label[key].polygon.track}`,
        polyline: `${data.label[key].polyline.shape} / ${data.label[key].polyline.track}`,
        points: `${data.label[key].points.shape} / ${data.label[key].points.track}`,
        tags: data.label[key].tags,
        manually: data.label[key].manually,
        interpolated: data.label[key].interpolated,
        total: data.label[key].total,
    }));

    rows.push({
        key: '___total',
        label: 'Total',
        rectangle: `${data.total.rectangle.shape} / ${data.total.rectangle.track}`,
        polygon: `${data.total.polygon.shape} / ${data.total.polygon.track}`,
        polyline: `${data.total.polyline.shape} / ${data.total.polyline.track}`,
        points: `${data.total.points.shape} / ${data.total.points.track}`,
        tags: data.total.tags,
        manually: data.total.manually,
        interpolated: data.total.interpolated,
        total: data.total.total,
    });

    const makeShapesTracksTitle = (title: string): JSX.Element => (
        <Tooltip title='Shapes / Tracks' mouseLeaveDelay={0}>
            <Text strong style={{ marginRight: 5 }}>
                {title}
            </Text>
            <Icon className='cvat-info-circle-icon' type='question-circle' />
        </Tooltip>
    );

    const columns = [
        {
            title: <Text strong> Label </Text>,
            dataIndex: 'label',
            key: 'label',
        },
        {
            title: makeShapesTracksTitle('Rectangle'),
            dataIndex: 'rectangle',
            key: 'rectangle',
        },
        {
            title: makeShapesTracksTitle('Polygon'),
            dataIndex: 'polygon',
            key: 'polygon',
        },
        {
            title: makeShapesTracksTitle('Polyline'),
            dataIndex: 'polyline',
            key: 'polyline',
        },
        {
            title: makeShapesTracksTitle('Points'),
            dataIndex: 'points',
            key: 'points',
        },
        {
            title: <Text strong> Tags </Text>,
            dataIndex: 'tags',
            key: 'tags',
        },
        {
            title: <Text strong> Manually </Text>,
            dataIndex: 'manually',
            key: 'manually',
        },
        {
            title: <Text strong> Interpolated </Text>,
            dataIndex: 'interpolated',
            key: 'interpolated',
        },
        {
            title: <Text strong> Total </Text>,
            dataIndex: 'total',
            key: 'total',
        },
    ];

    return (
        <Modal {...baseProps}>
            <div className='cvat-job-info-modal-window'>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text strong className='cvat-text'>
                            Job status
                        </Text>
                        <Select value={jobStatus} onChange={changeJobStatus}>
                            <Select.Option key='1' value='annotation'>
                                annotation
                            </Select.Option>
                            <Select.Option key='2' value='validation'>
                                validation
                            </Select.Option>
                            <Select.Option key='3' value='completed'>
                                completed
                            </Select.Option>
                        </Select>
                        {savingJobStatus && <Icon type='loading' />}
                    </Col>
                </Row>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text'>Overview</Text>
                    </Col>
                </Row>
                <Row type='flex' justify='start'>
                    <Col span={5}>
                        <Text strong className='cvat-text'>
                            Assignee
                        </Text>
                        <Text className='cvat-text'>{assignee}</Text>
                    </Col>
                    <Col span={5}>
                        <Text strong className='cvat-text'>
                            Start frame
                        </Text>
                        <Text className='cvat-text'>{startFrame}</Text>
                    </Col>
                    <Col span={5}>
                        <Text strong className='cvat-text'>
                            Stop frame
                        </Text>
                        <Text className='cvat-text'>{stopFrame}</Text>
                    </Col>
                    <Col span={5}>
                        <Text strong className='cvat-text'>
                            Frames
                        </Text>
                        <Text className='cvat-text'>{stopFrame - startFrame + 1}</Text>
                    </Col>
                </Row>
                {!!bugTracker && (
                    <Row type='flex' justify='start' className='cvat-job-info-bug-tracker'>
                        <Col>
                            <Text strong className='cvat-text'>
                                Bug tracker
                            </Text>
                            <a href={bugTracker}>{bugTracker}</a>
                        </Col>
                    </Row>
                )}
                <Row type='flex' justify='space-around' className='cvat-job-info-statistics'>
                    <Col span={24}>
                        <Text className='cvat-text'>Annotations statistics</Text>
                        <Table scroll={{ y: 400 }} bordered pagination={false} columns={columns} dataSource={rows} />
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}
