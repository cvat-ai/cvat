// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { ColumnFilterItem, Key } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Text from 'antd/lib/typography/Text';

import {
    Task, Job, JobType, ConsensusReport, User,
} from 'cvat-core-wrapper';
import { getQualityColor } from 'utils/quality-color';
import Tag from 'antd/lib/tag';
import { toRepresentation } from '../utils/text-formatting';

interface Props {
    task: Task;
    jobsReports: ConsensusReport[];
}

function AssigneeListComponent(props: Props): JSX.Element {
    const { task: taskInstance, jobsReports: jobsReportsArray } = props;

    const jobsReports: Record<number, ConsensusReport> = jobsReportsArray.reduce(
        (acc, report) => {
            if (!acc[report.jobID]) {
                acc[report.jobID] = report;
            }
            return acc;
        },
        {},
    );

    const { jobs } = taskInstance;
    const [renderedJobs] = useState<Job[]>(jobs.filter((job: Job) => job.type === JobType.ANNOTATION));

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
                Object.values(jobsReports).map((report: ConsensusReport) => {
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
            sorter: sorter('assignee.assignee.username'),
            filters: collectUsers('assignee'),
            onFilter: (value: boolean | Key, assignee: any) => (assignee.assignee?.username || false) === value,
        },
        {
            title: 'Conflicts',
            dataIndex: 'conflicts',
            key: 'conflicts',
            className: 'cvat-job-item-conflicts',
            sorter: sorter('conflicts.summary.conflictCount'),
            render: (value: number): JSX.Element => {
                const conflictCount = value;
                return (
                    <div className='cvat-job-list-item-conflicts'>
                        <Text>{conflictCount || 0}</Text>
                    </div>
                );
            },
        },
        {
            title: 'Score',
            dataIndex: 'quality',
            key: 'quality',
            align: 'center' as const,
            className: 'cvat-job-item-quality',
            sorter: sorter('quality.summary.accuracy'),
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
    const data = renderedJobs.reduce((acc: any[], job: any) => {
        const report = jobsReports[job.id];
        const { assignee } = job;
        const existingEntry = acc.find((entry) => entry.assignee === assignee);

        if (existingEntry) {
            existingEntry.conflicts += report?.summary?.conflictCount || 0;
            existingEntry.consensusScore += report?.consensus_score || 0;
        } else {
            acc.push({
                key: job.id,
                job: job.id,
                assignee,
                conflicts: report?.summary?.conflictCount,
                consensusScore: report?.consensus_score,
            });
        }

        return acc;
    }, []);

    console.log('data', data);

    return (
        <div className='cvat-task-job-list'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Text className='cvat-text-color cvat-jobs-header'> Assignees </Text>
                </Col>
            </Row>
            <Table
                className='cvat-task-jobs-table'
                rowClassName={() => 'cvat-task-jobs-table-row'}
                columns={columns}
                dataSource={data}
                size='small'
            />
        </div>
    );
}

export default React.memo(AssigneeListComponent);
