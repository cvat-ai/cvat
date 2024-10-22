// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Key } from 'antd/lib/table/interface';
import Icon, { DeleteOutlined } from '@ant-design/icons';

import { RestoreIcon } from 'icons';
import {
    Task, FramesMetaData, TaskValidationLayout, QualitySettings,
} from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { sorter } from 'utils/quality';

interface Props {
    task: Task;
    gtJobId: number;
    gtJobMeta: FramesMetaData;
    validationLayout: TaskValidationLayout;
    qualitySettings: QualitySettings;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

interface RowData {
    frame: number;
    name: string;
    active: boolean;
}

function AllocationTable(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJobId, gtJobMeta, validationLayout,
        onDeleteFrames, onRestoreFrames,
    } = props;

    const history = useHistory();
    const [selection, setSelection] = useState<{ selectedRowKeys: Key[], selectedRows: RowData[] }>({
        selectedRowKeys: [],
        selectedRows: [],
    });

    const { disabledFrames } = validationLayout;
    const data = validationLayout.validationFrames.map((frame: number, index: number) => ({
        key: frame,
        frame,
        name: gtJobMeta.frames[index]?.name ?? gtJobMeta.frames[0].name,
        active: !disabledFrames.includes(frame),
    }));

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
                            history.push(`/tasks/${task.id}/jobs/${gtJobId}?frame=${frame}`);
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
            sorter: sorter('name'),
            render: (name: string, record: RowData) => (
                <CVATTooltip title={name}>
                    <Button
                        className='cvat-open-frame-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${task.id}/jobs/${gtJobId}?frame=${record.frame}`);
                        }}
                    >
                        {name}
                    </Button>
                </CVATTooltip>
            ),
        },
        {
            title: 'Actions',
            dataIndex: 'active',
            key: 'actions',
            align: 'center' as const,
            width: 20,
            filters: [
                { text: 'Active', value: true },
                { text: 'Excluded', value: false },
            ],
            sorter: sorter('active'),
            onFilter: (value: boolean | Key, record: RowData) => record.active === value,
            render: (active: boolean, record: RowData): JSX.Element => (
                active ? (
                    <DeleteOutlined
                        className='cvat-allocation-frame-delete'
                        onClick={() => { onDeleteFrames([record.frame]); }}
                    />
                ) : (
                    <Icon
                        className='cvat-allocation-frame-restore'
                        onClick={() => { onRestoreFrames([record.frame]); }}
                        component={RestoreIcon}
                    />
                )
            ),
        },
    ];

    return (
        <div className='cvat-frame-allocation-list'>
            <Row justify='start' align='middle' className='cvat-frame-allocation-actions'>
                <Col>
                    <Text className='cvat-text-color cvat-frame-allocation-header'> Frames </Text>
                </Col>
                {
                    selection.selectedRowKeys.length !== 0 ? (
                        <>
                            <Col className='cvat-allocation-selection-frame-delete'>
                                <DeleteOutlined
                                    onClick={() => {
                                        const framesToUpdate = selection.selectedRows
                                            .filter((frameData) => frameData.active)
                                            .map((frameData) => frameData.frame);
                                        onDeleteFrames(framesToUpdate);
                                        setSelection({ selectedRowKeys: [], selectedRows: [] });
                                    }}
                                />
                            </Col>
                            <Col className='cvat-allocation-selection-frame-restore'>
                                <Icon
                                    onClick={() => {
                                        const framesToUpdate = selection.selectedRows
                                            .filter((frameData) => !frameData.active)
                                            .map((frameData) => frameData.frame);
                                        onRestoreFrames(framesToUpdate);
                                        setSelection({ selectedRowKeys: [], selectedRows: [] });
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
                    return 'cvat-allocation-frame-row';
                }}
                columns={columns}
                dataSource={data}
                rowSelection={{
                    selectedRowKeys: selection.selectedRowKeys,
                    onChange: (selectedRowKeys: Key[], selectedRows: RowData[]) => {
                        setSelection({
                            ...selection,
                            selectedRowKeys,
                            selectedRows,
                        });
                    },
                }}
                size='small'
                pagination={{ showSizeChanger: true }}
            />
        </div>
    );
}

function AllocationTableWrap(props: Readonly<Props>): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.qualityControlPage.allocationTable,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <AllocationTable {...props} />;
}

export default React.memo(AllocationTableWrap);
