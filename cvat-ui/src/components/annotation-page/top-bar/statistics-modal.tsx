// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Table from 'antd/lib/table';
import Modal from 'antd/lib/modal';
import Spin from 'antd/lib/spin';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import { DimensionType } from 'cvat-core-wrapper';
import { showStatistics } from 'actions/annotation-actions';

interface StateToProps {
    visible: boolean;
    collecting: boolean;
    data: any;
    jobStatus: string;
    savingJobStatus: boolean;
    bugTracker: string | null;
    startFrame: number;
    stopFrame: number;
    dimension: DimensionType;
    assignee: any | null;
}

interface DispatchToProps {
    closeStatistics(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            statistics: { visible, collecting, data },
            job: {
                saving: savingJobStatus,
                instance: {
                    bugTracker,
                    startFrame,
                    stopFrame,
                    assignee,
                    dimension,
                    status: jobStatus,
                },
            },
        },
    } = state;

    return {
        visible,
        collecting,
        data,
        jobStatus,
        savingJobStatus,
        bugTracker,
        startFrame,
        stopFrame,
        dimension,
        assignee: assignee?.username || 'Nobody',
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        closeStatistics(): void {
            dispatch(showStatistics(false));
        },
    };
}

function StatisticsModalComponent(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        collecting,
        data,
        visible,
        assignee,
        startFrame,
        stopFrame,
        bugTracker,
        closeStatistics,
        dimension,
    } = props;

    const is2D = dimension === DimensionType.DIMENSION_2D;

    const baseProps = {
        cancelButtonProps: { style: { display: 'none' } },
        okButtonProps: { style: { width: 100 } },
        onOk: closeStatistics,
        width: 1024,
        open: visible,
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
        ellipse: `${data.label[key].ellipse.shape} / ${data.label[key].ellipse.track}`,
        cuboid: `${data.label[key].cuboid.shape} / ${data.label[key].cuboid.track}`,
        skeleton: `${data.label[key].skeleton.shape} / ${data.label[key].skeleton.track}`,
        mask: `${data.label[key].mask.shape}`,
        tag: data.label[key].tag,
        manually: data.label[key].manually,
        interpolated: data.label[key].interpolated,
        total: data.label[key].total,
    }));

    rows.push({
        key: '___total',
        label: '总计',
        rectangle: `${data.total.rectangle.shape} / ${data.total.rectangle.track}`,
        polygon: `${data.total.polygon.shape} / ${data.total.polygon.track}`,
        polyline: `${data.total.polyline.shape} / ${data.total.polyline.track}`,
        points: `${data.total.points.shape} / ${data.total.points.track}`,
        ellipse: `${data.total.ellipse.shape} / ${data.total.ellipse.track}`,
        cuboid: `${data.total.cuboid.shape} / ${data.total.cuboid.track}`,
        skeleton: `${data.total.skeleton.shape} / ${data.total.skeleton.track}`,
        mask: `${data.total.mask.shape}`,
        tag: data.total.tag,
        manually: data.total.manually,
        interpolated: data.total.interpolated,
        total: data.total.total,
    });

    const makeShapesTracksTitle = (title: string): JSX.Element => (
        <CVATTooltip title='形状 / 轨迹'>
            <Text strong>{title}</Text>
            <QuestionCircleOutlined className='cvat-info-circle-icon' />
        </CVATTooltip>
    );

    const columns = [
        {
            title: <Text strong> 标签 </Text>,
            dataIndex: 'label',
            render: (text: string) => {
                const sep = '{{cvat.skeleton.lbl.sep}}';
                if (text.split(sep).length > 1) {
                    const [label, part] = text.split(sep);
                    return (
                        <>
                            <Text strong>{label}</Text>
                            {' \u2B95 '}
                            <Text strong>{part}</Text>
                        </>
                    );
                }

                return (<Text strong>{text}</Text>);
            },
            fixed: 'left',
            key: 'label',
            width: 120,
        },
        {
            title: makeShapesTracksTitle('Rectangle'),
            dataIndex: 'rectangle',
            key: 'rectangle',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('多边形'),
            dataIndex: 'polygon',
            key: 'polygon',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Polyline'),
            dataIndex: 'polyline',
            key: 'polyline',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Points'),
            dataIndex: 'points',
            key: 'points',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Ellipse'),
            dataIndex: 'ellipse',
            key: 'ellipse',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Cuboid'),
            dataIndex: 'cuboid',
            key: 'cuboid',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Skeleton'),
            dataIndex: 'skeleton',
            key: 'skeleton',
            width: 100,
        },
        {
            title: makeShapesTracksTitle('Mask'),
            dataIndex: 'mask',
            key: 'mask',
            width: 100,
        },
        {
            title: <Text strong> 标签 </Text>,
            dataIndex: 'tag',
            key: 'tag',
            width: 100,
        },
        {
            title: <Text strong> 手动 </Text>,
            dataIndex: 'manually',
            key: 'manually',
            fixed: 'right',
            width: 100,
        },
        {
            title: <Text strong> 插值 </Text>,
            dataIndex: 'interpolated',
            key: 'interpolated',
            fixed: 'right',
            width: 100,
        },
        {
            title: <Text strong> 总计 </Text>,
            dataIndex: 'total',
            key: 'total',
            fixed: 'right',
            width: 100,
        },
    ];

    const columns3D = [
        {
            title: <Text strong> 标签 </Text>,
            dataIndex: 'label',
            key: 'label',
        },
        {
            title: makeShapesTracksTitle('Cuboids'),
            dataIndex: 'cuboid',
            key: 'cuboid',
        },
        {
            title: <Text strong> 总计 </Text>,
            dataIndex: 'total',
            key: 'total',
        },
    ];

    return (
        <Modal {...baseProps}>
            <div className='cvat-job-info-modal-window'>
                <Row justify='start'>
                    <Col>
                        <Text className='cvat-text'>概览</Text>
                    </Col>
                </Row>
                <Row justify='start'>
                    <Col span={4}>
                        <Text strong className='cvat-text'>
                            负责人
                        </Text>
                        <Text className='cvat-text'>{assignee}</Text>
                    </Col>
                    <Col span={4}>
                        <Text strong className='cvat-text'>
                            起始帧
                        </Text>
                        <Text className='cvat-text'>{startFrame}</Text>
                    </Col>
                    <Col span={4}>
                        <Text strong className='cvat-text'>
                            结束帧
                        </Text>
                        <Text className='cvat-text'>{stopFrame}</Text>
                    </Col>
                    <Col span={4}>
                        <Text strong className='cvat-text'>
                            帧数
                        </Text>
                        <Text className='cvat-text'>{stopFrame - startFrame + 1}</Text>
                    </Col>
                </Row>
                {!!bugTracker && (
                    <Row justify='start' className='cvat-job-info-bug-tracker'>
                        <Col>
                            <Text strong className='cvat-text'>
                                问题追踪
                            </Text>
                            <a href={bugTracker}>{bugTracker}</a>
                        </Col>
                    </Row>
                )}
                <Row justify='space-around' className='cvat-job-info-statistics'>
                    <Col span={24}>
                        <Text className='cvat-text'>标注统计</Text>
                        <Table
                            scroll={{ x: 'max-content', y: 400 }}
                            bordered
                            pagination={false}
                            columns={is2D ? columns : columns3D}
                            dataSource={rows}
                        />
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(StatisticsModalComponent);


