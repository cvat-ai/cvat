// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useCallback } from 'react';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Button from 'antd/lib/button';
import { Key } from 'antd/lib/table/interface';
import Space from 'antd/lib/space';
import Icon, { DeleteOutlined } from '@ant-design/icons';

import { RestoreIcon } from 'icons';
import {
    Task, FramesMetaData, TaskValidationLayout, QualitySettings,
} from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import CVATTable from 'components/common/cvat-table';
import { sorter, tablePaginationPageSize } from 'utils/quality';

interface Props {
    task: Task;
    gtJobId: number;
    gtJobMeta: FramesMetaData;
    validationLayout: TaskValidationLayout;
    qualitySettings: QualitySettings;
    pageSizeData: { width: number, height: number };
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

interface RowData {
    frame: number;
    name: string;
    active: boolean;
}

const FRAME_NAME_WIDTH_COEF = 0.70;

function AllocationTable(props: Readonly<Props>): JSX.Element | null {
    const {
        task, gtJobId, gtJobMeta, validationLayout,
        onDeleteFrames, onRestoreFrames, pageSizeData,
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
        // videos have only 1 frame in meta
        name: gtJobMeta.frames[index]?.name ?? gtJobMeta.frames[0].name,
        active: !disabledFrames.includes(frame),
    }));

    const renderExtras = useCallback((): JSX.Element => (
        <Space>
            <DeleteOutlined
                className='cvat-allocation-selection-frame-delete'
                onClick={() => {
                    const framesToUpdate = selection.selectedRows
                        .filter((frameData) => frameData.active)
                        .map((frameData) => frameData.frame);
                    onDeleteFrames(framesToUpdate);
                    setSelection({ selectedRowKeys: [], selectedRows: [] });
                }}
            />
            <Icon
                className='cvat-allocation-selection-frame-restore'
                onClick={() => {
                    const framesToUpdate = selection.selectedRows
                        .filter((frameData) => !frameData.active)
                        .map((frameData) => frameData.frame);
                    onRestoreFrames(framesToUpdate);
                    setSelection({ selectedRowKeys: [], selectedRows: [] });
                }}
                component={RestoreIcon}
            />
        </Space>
    ), [selection, onDeleteFrames, onRestoreFrames]);

    const { width: pageWidth, height: pageHeight } = pageSizeData;
    const frameNameWidth = FRAME_NAME_WIDTH_COEF * pageWidth;
    const defaultPageSize = tablePaginationPageSize(pageHeight);

    if (!pageWidth || !pageHeight) {
        return null;
    }

    const columns = [
        {
            title: 'Frame',
            dataIndex: 'frame',
            key: 'frame',
            align: 'center' as const,
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
            align: 'center' as const,
            sorter: sorter('name'),
            width: frameNameWidth,
            render: (name: string, record: RowData) => {
                const link = `/tasks/${task.id}/jobs/${gtJobId}?frame=${record.frame}`;
                return (
                    <CVATTooltip title={name}>
                        <Button
                            style={{ width: frameNameWidth }}
                            className='cvat-open-frame-button'
                            type='link'
                            onClick={(e: React.MouseEvent): void => {
                                e.preventDefault();
                                history.push(link);
                            }}
                            href={link}
                        >
                            {name}
                        </Button>
                    </CVATTooltip>
                );
            },
        },
        {
            title: 'Actions',
            dataIndex: 'active',
            key: 'actions',
            filters: [
                { text: 'Active', value: true },
                { text: 'Excluded', value: false },
            ],
            align: 'center' as const,
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
        <CVATTable
            tableTitle='Frames'
            searchDataIndex={['name']}
            csvExport={{ filename: `allocation-table-task_${task.id}.csv` }}
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
            pagination={{ showSizeChanger: true, defaultPageSize, position: ['bottomCenter'] }}
            renderExtraActions={selection.selectedRowKeys.length ? renderExtras : undefined}
        />
    );
}

function AllocationTableWrap(props: Readonly<Props>): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.qualityControlPage.task.allocationTable,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <AllocationTable {...props} />;
}

export default React.memo(AllocationTableWrap);
