// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { DownloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Key } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import {
    Task, Job, JobType, QualityReport, getCore,
    TargetMetric,
} from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import Tag from 'antd/lib/tag';
import { collectUsers, QualityColors, sorter } from 'utils/quality';
import { toRepresentation } from '../utils/text-formatting';
import { ConflictsTooltip } from './gt-conflicts';

interface Props {
    task: Task;
    jobsReports: QualityReport[];
    getQualityColor: (value?: number) => QualityColors;
    targetMetric: TargetMetric;
}

function JobListComponent(props: Props): JSX.Element {
    const {
        task: taskInstance,
        jobsReports: jobsReportsArray,
        getQualityColor,
        targetMetric,
    } = props;

    const jobsReports: Record<number, QualityReport> = jobsReportsArray
        .reduce((acc, report) => ({ ...acc, [report.jobID]: report }), {});
    const history = useHistory();
    const { id: taskId, jobs } = taskInstance;
    const [renderedJobs] = useState<Job[]>(jobs.filter((job: Job) => job.type === JobType.ANNOTATION));

    const columns = [
        {
            title: 'Job',
            dataIndex: 'job',
            key: 'job',
            sorter: sorter('key'),
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
            onFilter: (value: boolean | Key, record: any) => record.stage.stage === value,
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            className: 'cvat-job-item-assignee',
            render: (report: QualityReport): JSX.Element => (
                <Text>{report?.assignee?.username}</Text>
            ),
            sorter: sorter('assignee.assignee.username'),
            filters: collectUsers(jobsReportsArray),
            onFilter: (value: boolean | Key, record: any) => (
                record.assignee.assignee?.username || false
            ) === value,
        },
        {
            title: 'Frame intersection',
            dataIndex: 'frame_intersection',
            key: 'frame_intersection',
            className: 'cvat-job-item-frame-intersection',
            sorter: sorter('frame_intersection.summary.frameCount'),
            render: (report?: QualityReport): JSX.Element => {
                const frames = report?.summary.frameCount;
                const frameSharePercent = report?.summary?.frameSharePercent;
                return (
                    <Text>
                        {toRepresentation(frames, false, 0)}
                        {frames ? ` (${toRepresentation(frameSharePercent)})` : ''}
                    </Text>
                );
            },
        },
        {
            title: 'Conflicts',
            dataIndex: 'conflicts',
            key: 'conflicts',
            className: 'cvat-job-item-conflicts',
            sorter: sorter('conflicts.summary.conflictCount'),
            render: (report: QualityReport): JSX.Element => {
                const conflictCount = report?.summary?.conflictCount;
                return (
                    <div className='cvat-job-list-item-conflicts'>
                        <Text>
                            {conflictCount || 0}
                        </Text>
                        <CVATTooltip
                            title={<ConflictsTooltip reportSummary={report?.summary} />}
                            className='cvat-analytics-tooltip'
                            overlayStyle={{ maxWidth: '500px' }}
                        >
                            <QuestionCircleOutlined
                                style={{ opacity: 0.5 }}
                            />
                        </CVATTooltip>
                    </div>
                );
            },
        },
        {
            title: 'Quality',
            dataIndex: 'quality',
            key: 'quality',
            align: 'center' as const,
            className: 'cvat-job-item-quality',
            sorter: sorter(`quality.summary.${targetMetric}`),
            render: (report?: QualityReport): JSX.Element => {
                const meanAccuracy = report?.summary?.[targetMetric];
                const accuracyRepresentation = toRepresentation(meanAccuracy);

                return (
                    accuracyRepresentation.includes('N/A') ? (
                        <Text
                            style={{
                                color: getQualityColor(meanAccuracy),
                            }}
                        >
                            N/A
                        </Text>
                    ) :
                        <Tag color={getQualityColor(meanAccuracy)}>{accuracyRepresentation}</Tag>
                );
            },
        },
        {
            title: 'Download',
            dataIndex: 'download',
            key: 'download',
            className: 'cvat-job-item-quality-report-download',
            align: 'center' as const,
            render: (job: Job): JSX.Element => {
                const report = jobsReports[job.id];
                const reportID = report?.id;
                return (
                    reportID ? (
                        <a
                            href={`${getCore().config.backendAPI}/quality/reports/${reportID}/data`}
                            download={`quality-report-job_${job.id}-${reportID}.json`}
                        >
                            <DownloadOutlined />
                        </a>
                    ) : <DownloadOutlined />
                );
            },
        },
    ];
    const data = renderedJobs.reduce((acc: any[], job: any) => {
        const report = jobsReports[job.id];
        acc.push({
            key: job.id,
            job: job.id,
            download: job,
            stage: job,
            assignee: report,
            quality: report,
            conflicts: report,
            frame_intersection: report,
        });

        return acc;
    }, []);

    return (
        <div className='cvat-task-job-list'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Text className='cvat-text-color cvat-jobs-header'> Jobs </Text>
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
