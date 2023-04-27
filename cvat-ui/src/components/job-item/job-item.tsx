// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import {
    Job, JobStage, JobType, User,
} from 'cvat-core-wrapper';
import { FundProjectionScreenOutlined, MoreOutlined } from '@ant-design/icons/lib/icons';
import { Link } from 'react-router-dom';
import moment from 'moment';
import UserSelector from 'components/task-page/user-selector';
import Dropdown from 'antd/lib/dropdown';
import JobActionsMenu from './job-actions-menu';

interface Props {
    job: Job,
    onJobUpdate: (job: Job) => void;
}

function JobItem(props: Props): JSX.Element {
    const { job, onJobUpdate } = props;
    const { stage } = job;
    const created = moment(job.createdDate);
    const now = moment(moment.now());

    return (
        <Col span={24}>
            <Card className='cvat-job-item'>
                <Row>
                    <Col span={1} className='cvat-job-item-icon'>
                        {job.type === JobType.GROUND_TRUTH ? <FundProjectionScreenOutlined /> : null }
                    </Col>
                    <Col xs={{ span: 6 }} xxl={{ span: 11 }}>
                        <Row>
                            <Col>
                                <Link to={`/tasks/${job.taskId}/jobs/${job.id}`}>{`Job #${job.id}`}</Link>
                            </Col>
                            <Col offset={1}>
                                <Text type='secondary'>{job.state.charAt(0).toUpperCase() + job.state.slice(1)}</Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Text type='secondary'>{`Started on ${created.format('MMMM Do YYYY HH:MM')}`}</Text>
                            </Col>
                            <Col xxl={{ offset: 4 }}>
                                <Text type='secondary'>{`Duration: ${moment.duration(now.diff(created)).humanize()}`}</Text>
                            </Col>
                        </Row>
                    </Col>
                    <Col flex='auto'>
                        <Row className='cvat-job-item-selects' justify='space-between'>
                            <Col>
                                <Row>
                                    <Col>
                                        <Text>Stage</Text>
                                        <Select
                                            value={stage}
                                            onChange={(newValue: JobStage) => {
                                                job.stage = newValue;
                                                onJobUpdate(job);
                                            }}
                                        >
                                            <Select.Option value={JobStage.ANNOTATION}>
                                                {JobStage.ANNOTATION}
                                            </Select.Option>
                                            <Select.Option value={JobStage.VALIDATION}>
                                                {JobStage.VALIDATION}
                                            </Select.Option>
                                            <Select.Option value={JobStage.ACCEPTANCE}>
                                                {JobStage.ACCEPTANCE}
                                            </Select.Option>
                                        </Select>
                                        {/* <CVATTooltip title={<ReviewSummaryComponent jobInstance={jobInstance} />}>
                            <QuestionCircleOutlined />
                        </CVATTooltip> */}
                                    </Col>
                                    <Col>
                                        <Text>Asignee</Text>
                                        <UserSelector
                                            className='cvat-job-assignee-selector'
                                            value={job.assignee}
                                            onSelect={(user: User | null): void => {
                                                if (job?.assignee?.id === user?.id) return;
                                                if (user) {
                                                    job.assignee = user;
                                                    onJobUpdate(job);
                                                }
                                            }}
                                        />
                                    </Col>
                                </Row>
                            </Col>
                            <Col>
                                <Dropdown overlay={<JobActionsMenu job={job} />}>
                                    <MoreOutlined className='cvat-job-item-more-button' />
                                </Dropdown>
                            </Col>
                        </Row>
                    </Col>

                </Row>
            </Card>
        </Col>
    );
}

export default React.memo(JobItem);
