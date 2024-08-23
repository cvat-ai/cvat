// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { ResizableBox } from 'react-resizable';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Icon, { DeleteOutlined } from '@ant-design/icons';
import { Task, Job, FramesMetaData } from 'cvat-core-wrapper';
import { RestoreIcon } from 'icons';
import { toRepresentation, sorter, QualityColors } from 'utils/quality';
import CVATTooltip from 'components/common/cvat-tooltip';

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
    key: number;
    frame: number;
    name: { name: string, index: number },
    useCount: number,
    quality: number,
    active: boolean,
    actions: { frameID: number, active: boolean },
}

function ResizableTitle(props) {
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

    const [select, setSelect] = useState<{ selectedRowKeys: string[], selectedRows: RowData[] }>({
        selectedRowKeys: [],
        selectedRows: [],
    });

    const rowSelection = {
        selectedRowKeys: select.selectedRowKeys,
        onChange: (selectedRowKeys: string[], selectedRows: RowData[]) => {
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
    const handleResize =
    (key: string) => (event, { size }) => {
        setColumns((prevColumns) => {
            const index = prevColumns.findIndex((col) => col.key === key);
            const nextColumns = [...prevColumns];
            nextColumns[index] = { ...nextColumns[index], width: size.width + RESIZE_HANDLE_OFFSET };
            if (key === 'name') {
                nextColumns[index].render = nameRenderFunc(size.width + RESIZE_HANDLE_OFFSET);
            }
            return nextColumns;
        });
    };

    const [columns, setColumns] = useState([
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
            sorter: sorter('useCount'),
            render: (): JSX.Element => (
                <Text
                    style={{
                        color: getQualityColor(0),
                    }}
                >
                    N/A
                </Text>
            ),
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
            sorter: sorter('quality'),
            render: (): JSX.Element => (
                <Text
                    style={{
                        color: getQualityColor(0),
                    }}
                >
                    N/A
                </Text>
            ),
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
            onFilter: (value: boolean, record: any) => record.actions.frameData.active === value,
            render: ({ frameID, active }: { frameID: number, active: boolean }): JSX.Element => (
                active ? (
                    <Icon
                        onClick={() => { onRestoreFrames([frameID]); }}
                        component={RestoreIcon}
                    />
                ) : (
                    <DeleteOutlined
                        onClick={() => { onDeleteFrames([frameID]); }}
                    />
                )
            ),
        },
    ]);

    const data = gtJobMeta.includedFrames.map((frameID: number) => ({
        key: frameID,
        frame: frameID,
        name: { name: gtJobMeta.frames[frameID].name, index: frameID },
        useCount: frameID,
        quality: frameID,
        active: !(frameID in gtJobMeta.deletedFrames),
        actions: { frameID, active: frameID in gtJobMeta.deletedFrames },
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
