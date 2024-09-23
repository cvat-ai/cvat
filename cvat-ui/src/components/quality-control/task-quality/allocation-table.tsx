// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Key } from 'antd/lib/table/interface';
import Icon, { DeleteOutlined } from '@ant-design/icons';

import { RestoreIcon } from 'icons';
import { Task, Job, FramesMetaData } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { sorter } from 'utils/quality';
import { range } from 'lodash';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

interface RowData {
    frame: number;
    name: string;
    active: boolean;
}

function AllocationTableComponent(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJob, gtJobMeta,
        onDeleteFrames, onRestoreFrames,
    } = props;

    const history = useHistory();
    const [selection, setSelection] = useState<{ selectedRowKeys: Key[], selectedRows: RowData[] }>({
        selectedRowKeys: [],
        selectedRows: [],
    });

    const data = (() => {
        // A workaround for meta frames using source data numbers
        // TODO: remove once meta is migrated to relative frame numbers
        function getDataStartFrame(meta: FramesMetaData, localStartFrame: number): number {
            return meta.startFrame - localStartFrame * meta.frameStep;
        }

        function getFrameNumber(dataFrameNumber: number, dataStartFrame: number, step: number): number {
            return (dataFrameNumber - dataStartFrame) / step;
        }

        const dataStartFrame = getDataStartFrame(gtJobMeta, gtJob.startFrame);
        const jobFrameNumbers = gtJobMeta.getDataFrameNumbers().map((dataFrameID: number) => (
            getFrameNumber(dataFrameID, dataStartFrame, gtJobMeta.frameStep)
        ));

        const jobDataSegmentFrameNumbers = range(
            gtJobMeta.startFrame, gtJobMeta.stopFrame + 1, gtJobMeta.frameStep,
        );

        let includedIndex = 0;
        const result: any[] = [];
        for (let index = 0; index < jobDataSegmentFrameNumbers.length; ++index) {
            const dataFrameID = jobDataSegmentFrameNumbers[index];

            if (gtJobMeta.includedFrames && !gtJobMeta.includedFrames.includes(dataFrameID)) {
                continue;
            }

            const frameID = jobFrameNumbers[includedIndex];

            result.push({
                key: frameID,
                frame: frameID,
                name: gtJobMeta.frames[index]?.name ?? gtJobMeta.frames[0].name,
                active: !(frameID in gtJobMeta.deletedFrames),
            });

            ++includedIndex;
        }

        return result;
    })();

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
            sorter: sorter('name'),
            render: (name: string, record: RowData) => (
                <CVATTooltip title={name}>
                    <Button
                        className='cvat-open-frame-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${task.id}/jobs/${gtJob.id}?frame=${record.frame}`);
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
                        onClick={() => { onDeleteFrames([record.frame]); }}
                    />
                ) : (
                    <Icon
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
                            <Col>
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
                            <Col>
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
                    return 'cvat-allocation-frame';
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

export default React.memo(AllocationTableComponent);
