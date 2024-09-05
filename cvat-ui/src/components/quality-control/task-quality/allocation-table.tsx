// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Key } from 'antd/lib/table/interface';
import Icon, { DeleteOutlined } from '@ant-design/icons';

import { RestoreIcon } from 'icons';
import { Task, Job, FramesMetaData } from 'cvat-core-wrapper';
import { sorter, QualityColors } from 'utils/quality';
import CVATTooltip from 'components/common/cvat-tooltip';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    getQualityColor: (value?: number) => QualityColors;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

interface RowData {
    frame: number;
    name: { name: string, index: number },
    useCount: number,
    quality: number,
    active: boolean,
    actions: { frameID: number, active: boolean },
}

export default function AllocationTableComponent(props: Readonly<Props>): JSX.Element {
    const {
        task,
        gtJob,
        gtJobMeta,
        getQualityColor,
        onDeleteFrames,
        onRestoreFrames,
    } = props;

    const history = useHistory();
    const notAvailableComponent = <Text style={{ color: getQualityColor(0) }}>Unknown</Text>;

    const qualityColumnPlugins = usePlugins(
        (state: CombinedState) => (
            state.plugins.components.qualityControlPage.tabs.management.allocationTable.columns.quality
        ), props, { frameID: null },
    );
    const qualitySorter = useSelector((state: CombinedState) => (
        state.plugins.callbacks.qualityControlPage.tabs.management.allocationTable.columns.quality.sorter
    ))[0] ?? sorter('quality');

    const useCountColumnPlugins = usePlugins(
        (state: CombinedState) => (
            state.plugins.components.qualityControlPage.tabs.management.allocationTable.columns.useCount
        ), props, { frameID: null },
    );
    const useCountSorter = useSelector((state: CombinedState) => (
        state.plugins.callbacks.qualityControlPage.tabs.management.allocationTable.columns.useCount.sorter
    ))[0] ?? sorter('useCount');

    const allocationTableActionsPlugins = usePlugins(
        (state: CombinedState) => (
            state.plugins.components.qualityControlPage.tabs.management.allocationTable.actions
        ), props,
    );

    const allocationTableActionsItems: [JSX.Element, number][] = [];
    allocationTableActionsItems.push(
        ...allocationTableActionsPlugins.map(({ component: Component, weight }, index) => {
            const component = <Component targetProps={props} key={index} />;
            return [component, weight] as [JSX.Element, number];
        }),
    );

    const [select, setSelect] = useState<{ selectedRowKeys: Key[], selectedRows: RowData[] }>({
        selectedRowKeys: [],
        selectedRows: [],
    });

    const rowSelection = {
        selectedRowKeys: select.selectedRowKeys,
        onChange: (selectedRowKeys: Key[], selectedRows: RowData[]) => {
            setSelect({
                ...select,
                selectedRowKeys: [...selectedRowKeys],
                selectedRows: [...selectedRows],
            });
        },
    };

    const columns = [
        {
            title: 'Frame',
            dataIndex: 'frame',
            key: 'frame',
            width: 50,
            sorter: sorter('frame'),
            render: (frame: number): JSX.Element => (
                <div>
                    <Button
                        className='cvat-open-frame-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${task.id}/jobs/${gtJob.id}?frame=${frame}`);
                        }}
                    >
                        {`#${frame}`}
                    </Button>
                </div>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 300,
            sorter: sorter('name.name'),
            render: ({ name, index }: { name: string, index: number }) => (
                <CVATTooltip title={name}>
                    <Button
                        className='cvat-open-frame-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${task.id}/jobs/${gtJob.id}?frame=${index}`);
                        }}
                    >
                        {name}
                    </Button>
                </CVATTooltip>
            ),
        },
        {
            title: 'Use count',
            dataIndex: 'useCount',
            key: 'useCount',
            align: 'center' as const,
            width: 100,
            sorter: useCountSorter,
            render: (frameID: number): JSX.Element => {
                const useCountColumnItems: [JSX.Element, number][] = [[notAvailableComponent, 10]];
                useCountColumnItems.push(
                    ...useCountColumnPlugins.map(({ component: Component, weight }, index) => {
                        const component = <Component targetProps={props} key={index} targetState={{ frameID }} />;
                        return [component, weight] as [JSX.Element, number];
                    }),
                );
                const renderedComponent = useCountColumnItems.sort((a, b) => b[1] - a[1])[0][0];

                return renderedComponent;
            },
        },
        {
            title: 'Quality',
            dataIndex: 'quality',
            key: 'quality',
            align: 'center' as const,
            className: 'cvat-job-item-quality',
            width: 50,
            sorter: qualitySorter,
            render: (frameID: number): JSX.Element => {
                const qualityColumnItems: [JSX.Element, number][] = [[notAvailableComponent, 10]];
                qualityColumnItems.push(
                    ...qualityColumnPlugins.map(({ component: Component, weight }, index) => {
                        const component = <Component targetProps={props} key={index} targetState={{ frameID }} />;
                        return [component, weight] as [JSX.Element, number];
                    }),
                );
                const renderedComponent = qualityColumnItems.sort((a, b) => b[1] - a[1])[0][0];

                return renderedComponent;
            },
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            key: 'actions',
            align: 'center' as const,
            className: 'cvat-job-item-quality',
            width: 20,
            filters: [
                { text: 'Active', value: true },
                { text: 'Excluded', value: false },
            ],
            sorter: sorter('active'),
            onFilter: (value: boolean | Key, record: RowData) => record.actions.active === value,
            render: ({ frameID, active }: { frameID: number, active: boolean }): JSX.Element => (
                active ? (
                    <DeleteOutlined
                        onClick={() => { onDeleteFrames([frameID]); }}
                    />
                ) : (
                    <Icon
                        onClick={() => { onRestoreFrames([frameID]); }}
                        component={RestoreIcon}
                    />
                )
            ),
        },
    ];

    const data = gtJobMeta.includedFrames.map((frameID: number) => ({
        key: frameID,
        frame: frameID,
        name: { name: gtJobMeta.frames[frameID]?.name ?? gtJobMeta.frames[0].name, index: frameID },
        useCount: frameID,
        quality: frameID,
        active: !(frameID in gtJobMeta.deletedFrames),
        actions: { frameID, active: !(frameID in gtJobMeta.deletedFrames) },
    }),
    );

    return (
        <div className='cvat-frame-allocation-list'>
            <Row justify='start' align='middle' className='cvat-frame-allocation-actions'>
                <Col>
                    <Text className='cvat-text-color cvat-frame-allocation-header'> Frames </Text>
                </Col>
                {
                    allocationTableActionsItems.sort((item1, item2) => item1[1] - item2[1])
                        .map((item) => item[0])
                }
                {
                    select.selectedRowKeys.length !== 0 ? (
                        <>
                            <Col>
                                <DeleteOutlined
                                    onClick={() => {
                                        const framesToUpdate = select.selectedRows
                                            .filter((frameData) => frameData.active)
                                            .map((frameData) => frameData.frame);
                                        onDeleteFrames(framesToUpdate);
                                        setSelect({
                                            ...select,
                                            selectedRowKeys: [],
                                            selectedRows: [],
                                        });
                                    }}
                                />
                            </Col>
                            <Col>
                                <Icon
                                    onClick={() => {
                                        const framesToUpdate = select.selectedRows
                                            .filter((frameData) => !frameData.active)
                                            .map((frameData) => frameData.frame);
                                        onRestoreFrames(framesToUpdate);
                                        setSelect({
                                            ...select,
                                            selectedRowKeys: [],
                                            selectedRows: [],
                                        });
                                    }}
                                    component={RestoreIcon}
                                />
                            </Col>
                        </>
                    ) : null
                }
            </Row>
            <Table
                className='cvat-frame-allocation-table'
                rowClassName={(rowData) => {
                    if (!rowData.active) {
                        return 'cvat-allocation-frame-row cvat-allocation-frame-row-excluded';
                    }
                    return 'cvat-allocation-frame';
                }}
                columns={columns}
                dataSource={data}
                rowSelection={rowSelection}
                size='small'
                pagination={{ showSizeChanger: true }}
            />
        </div>
    );
}
