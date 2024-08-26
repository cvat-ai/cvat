// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { ResizableBox, ResizableProps, ResizeCallbackData } from 'react-resizable';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Icon, { DeleteOutlined } from '@ant-design/icons';
import { Task, Job, FramesMetaData } from 'cvat-core-wrapper';
import { RestoreIcon } from 'icons';
import { sorter, QualityColors } from 'utils/quality';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Key, ColumnType } from 'antd/lib/table/interface';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';

const DEFAULT_TITLE_HEIGHT = 20;
const DEFAULT_TITLE_WIDTH = 100;
const RESIZE_HANDLE_OFFSET = 30;

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

function ResizableTitle(props: Partial<ResizableProps>) {
    const { children, onResize } = props;
    return (
        <ResizableBox
            height={DEFAULT_TITLE_HEIGHT}
            width={DEFAULT_TITLE_WIDTH}
            minConstraints={[DEFAULT_TITLE_WIDTH, DEFAULT_TITLE_HEIGHT]}
            maxConstraints={[DEFAULT_TITLE_WIDTH * 3, DEFAULT_TITLE_HEIGHT]}
            onResize={onResize}
            axis='x'
            draggableOpts={{ enableUserSelectHack: false }}
        >
            {children}
        </ResizableBox>
    );
}

export default function AllocationTableComponent(props: Props): JSX.Element {
    const {
        task,
        gtJob,
        gtJobMeta,
        getQualityColor,
        onDeleteFrames,
        onRestoreFrames,
    } = props;

    const history = useHistory();

    const notAvailableComponent = (
        <Text
            style={{
                color: getQualityColor(0),
            }}
        >
            N/A
        </Text>
    );
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

    function nameRenderFunc(width: number) {
        const component = ({ index, name }: { index: number, name: string }): JSX.Element => (
            <CVATTooltip title={name}>
                <Button
                    className='cvat-open-fame-button'
                    type='link'
                    onClick={(e: React.MouseEvent): void => {
                        e.preventDefault();
                        history.push(`/tasks/${task.id}/jobs/${gtJob.id}?frame=${index}`);
                    }}
                >
                    <span style={{ width }}>{name}</span>
                </Button>
            </CVATTooltip>
        );
        return component;
    }

    const [columns, setColumns] = useState<ColumnType<RowData>[]>([]);
    const handleResize =
    (key: string) => (e: React.SyntheticEvent, data: ResizeCallbackData) => {
        const { size: { width } } = data;
        setColumns((prevColumns) => {
            const index = prevColumns.findIndex((col) => col.key === key);
            const nextColumns = [...prevColumns];
            nextColumns[index] = { ...nextColumns[index], width: width + RESIZE_HANDLE_OFFSET };
            if (key === 'name') {
                nextColumns[index].render = nameRenderFunc(width + RESIZE_HANDLE_OFFSET);
            }
            return nextColumns;
        });
    };
    useEffect(() => {
        setColumns([
            {
                title: (
                    <ResizableTitle onResize={handleResize('frame')}>
                        <Text>Frame</Text>
                    </ResizableTitle>
                ),
                dataIndex: 'frame',
                key: 'frame',
                sorter: sorter('frame'),
                render: (index: number): JSX.Element => (
                    <div>
                        <Button
                            className='cvat-open-fame-button'
                            type='link'
                            onClick={(e: React.MouseEvent): void => {
                                e.preventDefault();
                                history.push(`/tasks/${task.id}/jobs/${gtJob.id}?frame=${index}`);
                            }}
                        >
                            {`#${index}`}
                        </Button>
                    </div>
                ),
            },
            {
                title: (
                    <ResizableTitle onResize={handleResize('name')}>
                        <Text>Name</Text>
                    </ResizableTitle>
                ),
                dataIndex: 'name',
                key: 'name',
                width: DEFAULT_TITLE_WIDTH,
                sorter: sorter('name.name'),
                render: nameRenderFunc(DEFAULT_TITLE_WIDTH),
            },
            {
                title: (
                    <ResizableTitle onResize={handleResize('useCount')}>
                        <Text>Use count</Text>
                    </ResizableTitle>
                ),
                dataIndex: 'useCount',
                key: 'useCount',
                align: 'center' as const,
                sorter: useCountSorter,
                render: (frameID): JSX.Element => {
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
                title: (
                    <ResizableTitle onResize={handleResize('quality')}>
                        <Text>Quality</Text>
                    </ResizableTitle>
                ),
                dataIndex: 'quality',
                key: 'quality',
                align: 'center' as const,
                className: 'cvat-job-item-quality',
                sorter: qualitySorter,
                render: (frameID): JSX.Element => {
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
                title: (
                    <ResizableTitle onResize={handleResize('actions')}>
                        <Text>Actions</Text>
                    </ResizableTitle>
                ),
                dataIndex: 'actions',
                key: 'actions',
                align: 'center' as const,
                className: 'cvat-job-item-quality',
                sorter: sorter('active'),
                filters: [
                    { text: 'Active', value: true },
                    { text: 'Excluded', value: false },
                ],
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
        ]);
    }, []);

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
