// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { CopyOutlined } from '@ant-design/icons';
import { ColumnFilterItem } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import copy from 'copy-to-clipboard';

import {
    Task, Job, JobType, QualityReport,
} from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import { useSelector } from 'react-redux';
import { getQualityColor } from 'utils/quality-color';

interface Props {
    task: Task;
}

function JobListComponent(props: Props): JSX.Element {
    const {
        task: taskInstance,
    } = props;

    const history = useHistory();
    const { id: taskId } = taskInstance;
    const { jobs } = taskInstance;
    const [renderedJobs] = useState<Job[]>(jobs.filter((job: Job) => job.type === JobType.NORMAL));
    const [jobsReports, setJobsReports] = useState<Record<number, QualityReport>>({});
    const jobReportsFromState: QualityReport[] =
        useSelector((state: CombinedState) => state.analytics.quality.jobsReports);

    useEffect(() => {
        const jobsReportsMap: Record<number, QualityReport> = {};
        for (const job of jobs) {
            const report = jobReportsFromState.find((_report: QualityReport) => _report.jobId === job.id);
            if (report) jobsReportsMap[job.id] = report;
        }
        setJobsReports(jobsReportsMap);
    }, [renderedJobs, jobReportsFromState]);

    function sorter(path: string) {
        return (obj1: any, obj2: any): number => {
            let currentObj1 = obj1;
            let currentObj2 = obj2;
            let field1: string | null = null;
            let field2: string | null = null;
            for (const pathSegment of path.split('.')) {
                field1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                field2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
                currentObj1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                currentObj2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
            }

            if (field1 && field2) {
                return field1.localeCompare(field2);
            }

            if (field1 === null) {
                return 1;
            }

            return -1;
        };
    }

    function collectUsers(path: string): ColumnFilterItem[] {
        return Array.from<string | null>(
            new Set(
                jobs.map((job: any) => {
                    if (job[path] === null) {
                        return null;
                    }

                    return job[path].username;
                }),
            ),
        ).map((value: string | null) => ({ text: value || 'Is Empty', value: value || false }));
    }

    const columns = [
        {
            title: 'Job',
            dataIndex: 'job',
            key: 'job',
            render: (id: number): JSX.Element => (
                <div>
                    <Button
                        className='cvat-open-job-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${taskId}/jobs/${id}`);
                        }}
                        href={`/tasks/${taskId}/jobs/${id}`}
                    >
                        {`Job #${id}`}
                    </Button>
                </div>
            ),
        },
        {
            title: 'Stage',
            dataIndex: 'stage',
            key: 'stage',
            className: 'cvat-job-item-stage',
            render: (jobInstance: any): JSX.Element => {
                const { stage } = jobInstance;

                return (
                    <div>
                        <Text>{stage}</Text>
                    </div>
                );
            },
            sorter: sorter('stage.stage'),
            filters: [
                { text: 'annotation', value: 'annotation' },
                { text: 'validation', value: 'validation' },
                { text: 'acceptance', value: 'acceptance' },
            ],
            onFilter: (value: string | number | boolean, record: any) => record.stage.stage === value,
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            className: 'cvat-job-item-assignee',
            render: (jobInstance: any): JSX.Element => (
                <Text>{jobInstance?.assignee?.username}</Text>
            ),
            sorter: sorter('assignee.assignee.username'),
            filters: collectUsers('assignee'),
            onFilter: (value: string | number | boolean, record: any) => (
                record.assignee.assignee?.username || false
            ) === value,
        },
        {
            title: 'Quality',
            dataIndex: 'quality',
            key: 'quality',
            className: 'cvat-job-item-quality',
            render: (jobInstance: Job): JSX.Element => {
                const meanAccuracy = jobsReports[jobInstance.id]?.summary?.accuracy;
                return (
                    <Text
                        style={{
                            color: getQualityColor(meanAccuracy),
                        }}
                    >
                        {Number.isNaN(meanAccuracy) ? 'N/A' : `${meanAccuracy}%`}
                    </Text>
                );
            },
        },
    ];
    const data = renderedJobs.reduce((acc: any[], job: any) => {
        acc.push({
            key: job.id,
            job: job.id,
            stage: job,
            assignee: job,
            quality: job,
        });

        return acc;
    }, []);

    return (
        <div className='cvat-task-job-list'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Text className='cvat-text-color cvat-jobs-header'> Jobs </Text>
                    <CVATTooltip trigger='click' title='Copied to clipboard!'>
                        <Button
                            className='cvat-copy-job-details-button'
                            type='link'
                            onClick={(): void => {
                                let serialized = '';
                                const [latestJob] = [...taskInstance.jobs].reverse();
                                for (const job of taskInstance.jobs) {
                                    const baseURL = window.location.origin;
                                    serialized += `Job #${job.id}`.padEnd(`${latestJob.id}`.length + 6, ' ');
                                    serialized += `: ${baseURL}/tasks/${taskInstance.id}/jobs/${job.id}`.padEnd(
                                        `${latestJob.id}`.length + baseURL.length + 8,
                                        ' ',
                                    );
                                    serialized += `: [${job.startFrame}-${job.stopFrame}]`.padEnd(
                                        `${latestJob.startFrame}${latestJob.stopFrame}`.length + 5,
                                        ' ',
                                    );

                                    if (job.assignee) {
                                        serialized += `\t assigned to "${job.assignee.username}"`;
                                    }

                                    serialized += '\n';
                                }
                                copy(serialized);
                            }}
                        >
                            <CopyOutlined />
                            Copy
                        </Button>
                    </CVATTooltip>
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

export default React.memo(JobListComponent);
