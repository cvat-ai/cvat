// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ColumnFilterItem, Key } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Text from 'antd/lib/typography/Text';

import {
    Task, User, AssigneeConsensusReport,
} from 'cvat-core-wrapper';
import { getQualityColor } from 'utils/quality-color';
import Tag from 'antd/lib/tag';
import { toRepresentation } from '../utils/text-formatting';

interface Props {
    task: Task;
    assigneeReports: AssigneeConsensusReport[];
}

function AssigneeListComponent(props: Props): JSX.Element {
    const { assigneeReports: assigneeReportsArray } = props;
    console.log('assigneeReportsArray', assigneeReportsArray);
    const assigneeReports: Record<number, AssigneeConsensusReport> = assigneeReportsArray
        .reduce((acc, report) => ({ ...acc, [report.assignee_id]: report }), {});

    console.log('as', assigneeReports);

    function sorter(path: string) {
        return (obj1: any, obj2: any): number => {
            let currentObj1 = obj1;
            let currentObj2 = obj2;
            let field1: string | number | null = null;
            let field2: string | number | null = null;
            for (const pathSegment of path.split('.')) {
                field1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                field2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
                currentObj1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                currentObj2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
            }

            if (field1 !== null && field2 !== null) {
                if (typeof field1 === 'string' && typeof field2 === 'string') return field1.localeCompare(field2);
                if (
                    typeof field1 === 'number' &&
                    typeof field2 === 'number' &&
                    Number.isFinite(field1) &&
                    Number.isFinite(field2)
                ) return field1 - field2;
            }

            if (field1 === null && field2 === null) return 0;

            if (field1 === null || (typeof field1 === 'number' && !Number.isFinite(field1))) {
                return -1;
            }

            return 1;
        };
    }

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
        ).map((value: string | null) => ({ text: value || 'Is Empty', value: value || false }));
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
            onFilter: (value: boolean | Key, assignee: any) => (assignee.assignee?.username || false) === value,
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
                            color: getQualityColor(value),
                        }}
                    >
                        N/A
                    </Text>
                ) : (
                    <Tag color={getQualityColor(value)}>{consensusScoreRepresentation}</Tag>
                );
            },
        },
    ];
    const data = assigneeReportsArray.reduce((acc: any[], assigneeReport: any) => {
        const report = assigneeReports[assigneeReport.assignee.id];
        acc.push({
            key: report.assignee_id,
            assignee: report.assignee,
            quality: report.consensus_score,
            conflict_count: report.conflict_count,
        });

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
