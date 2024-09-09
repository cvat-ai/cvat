// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ColumnFilterItem, Key } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Text from 'antd/lib/typography/Text';

import {
    User, AssigneeConsensusReport,
} from 'cvat-core-wrapper';
import Tag from 'antd/lib/tag';
import { sorter, toRepresentation, qualityColorGenerator } from 'utils/quality';

interface Props {
    assigneeReports: AssigneeConsensusReport[];
}

function AssigneeListComponent(props: Props): JSX.Element {
    const { assigneeReports: assigneeReportsArray } = props;
    const assigneeReports: Record<number, AssigneeConsensusReport> = assigneeReportsArray
        .reduce((acc, report) => ({ ...acc, [report?.assignee?.id]: report }), {});

    function collectUsers(path: string): ColumnFilterItem[] {
        return Array.from<string | null>(
            new Set(
                Object.values(assigneeReports).map((report: AssigneeConsensusReport) => {
                    if (report[path] === null) {
                        return null;
                    }

                    return report[path].username;
                }),
            ),
        ).map((value: string | null) => ({ text: value ?? 'Is Empty', value: value ?? false }));
    }

    const columns = [
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            className: 'cvat-job-item-assignee',
            render: (assignee: User): JSX.Element => <Text>{assignee?.username}</Text>,
            sorter: sorter('assignee.username'),
            filters: collectUsers('assignee'),
            onFilter: (value: boolean | Key, assignee: any) => (assignee?.assignee?.username || false) === value,
        },
        {
            title: 'Conflicts',
            dataIndex: 'conflict_count',
            key: 'conflict_count',
            className: 'cvat-job-item-conflict',
            sorter: sorter('conflict_count'),
            render: (value: number): JSX.Element => <Text>{value}</Text>,
        },
        {
            title: 'Score',
            dataIndex: 'quality',
            key: 'quality',
            className: 'cvat-job-item-quality',
            sorter: sorter('quality'),
            render: (value: number): JSX.Element => {
                const meanConsensusScore = value;
                const consensusScoreRepresentation = toRepresentation(meanConsensusScore);
                return consensusScoreRepresentation.includes('N/A') ? (
                    <Text
                        style={{
                            color: qualityColorGenerator(0.9)(value),
                        }}
                    >
                        N/A
                    </Text>
                ) : (
                    <Tag color={qualityColorGenerator(0.9)(value)}>{consensusScoreRepresentation}</Tag>
                );
            },
        },
    ];
    const data = assigneeReportsArray.reduce((acc: any[], assigneeReport: any) => {
        const report = assigneeReports[assigneeReport?.assignee?.id];
        if (report?.assignee) {
            acc.push({
                key: report.assignee.id || 0,
                assignee: report.assignee,
                quality: report.consensusScore,
                conflict_count: report.conflictCount,
            });
        }

        return acc;
    }, []);

    return (
        <div className='cvat-task-job-list'>
            <Table
                className='cvat-task-jobs-table'
                rowClassName={() => 'cvat-task-jobs-table-row'}
                columns={columns}
                dataSource={data}
                size='small'
                style={{ width: '100%' }}
            />
        </div>
    );
}

export default React.memo(AssigneeListComponent);
