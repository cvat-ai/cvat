// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import moment from 'moment';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import JobItem from 'components/job-item/job-item';
import {
    Job, JobType, QualityReport, Task,
} from 'cvat-core-wrapper';
import React from 'react';
import CVATTooltip from 'components/common/cvat-tooltip';
import EmptyGtJob from './empty-job';
import GtConflicts from './gt-conflicts';
import Issues from './issues';
import JobList from './job-list';
import MeanQuality from './mean-quality';

interface Props {
    task: Task;
    taskReport: QualityReport | null;
    jobsReports: QualityReport[];
    reportRefreshingStatus: string | null;
    onJobUpdate: (job: Job, data: Parameters<Job['save']>[0]) => void;
    onCreateReport: () => void;
}

function TaskQualityComponent(props: Props): JSX.Element {
    const {
        task, onJobUpdate, taskReport, jobsReports, reportRefreshingStatus, onCreateReport,
    } = props;

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);

    return (
        <div className='cvat-task-quality-page'>
            {
                gtJob ? (
                    <>
                        <Row align='middle' justify='space-between'>
                            <Col>
                                <CVATTooltip title='Request calculating a new report'>
                                    <Button
                                        className='cvat-analytics-refresh-button'
                                        onClick={onCreateReport}
                                        icon={reportRefreshingStatus !== null ?
                                            <LoadingOutlined /> : <ReloadOutlined />}
                                        disabled={reportRefreshingStatus !== null}
                                    />
                                </CVATTooltip>
                                <Text type='secondary'>
                                    { reportRefreshingStatus || `Created ${taskReport?.id ? moment(taskReport.createdDate).fromNow() : ''}`}
                                </Text>
                            </Col>
                            <Col>
                                <Text type='secondary'>
                                    Validation mode:
                                </Text>
                                <Text type='secondary' strong>
                                    &nbsp;&nbsp;Honeypots
                                </Text>
                            </Col>
                        </Row>
                        <Row>
                            <MeanQuality
                                taskReport={taskReport}
                                taskID={task.id}
                            />
                        </Row>
                        <Row gutter={16}>
                            <GtConflicts taskReport={taskReport} />
                            <Issues task={task} />
                        </Row>
                        {
                            (!(gtJob && gtJob.stage === 'acceptance' && gtJob.state === 'completed')) ? (
                                <Row>
                                    <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                Quality reports are not computed unless the GT job is in the&nbsp;
                                        <strong>completed state</strong>
                                &nbsp;and&nbsp;
                                        <strong>acceptance stage.</strong>
                                    </Text>
                                </Row>
                            ) : null
                        }
                        <Row>
                            <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} />
                        </Row>
                        <Row>
                            <JobList jobsReports={jobsReports} task={task} />
                        </Row>
                    </>
                ) : (
                    <Row justify='center'>
                        <EmptyGtJob taskID={task.id} />
                    </Row>
                )
            }
        </div>
    );
}

export default React.memo(TaskQualityComponent);
