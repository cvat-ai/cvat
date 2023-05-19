// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Icon from '@ant-design/icons';
import {
    Job, JobStage, JobType, User,
} from 'cvat-core-wrapper';
import { MoreOutlined, ProjectOutlined } from '@ant-design/icons/lib/icons';
import { Link } from 'react-router-dom';
import moment from 'moment';
import UserSelector from 'components/task-page/user-selector';
import Dropdown from 'antd/lib/dropdown';
import Tag from 'antd/lib/tag';
import { DurationIcon, FrameCountIcon, FramesIcon } from 'icons';
import JobActionsMenu from './job-actions-menu';

interface Props {
    job: Job,
    onJobUpdate: (job: Job) => void;
}

function JobItem(props: Props): JSX.Element {
    const { job, onJobUpdate } = props;
    const { stage } = job;
    const created = moment(job.createdDate);
    const updated = moment(job.createdDate);
    const now = moment(moment.now());
    console.log(job);
    return (
        <Col span={24}>
            <Card className='cvat-job-item'>
                <Row>
                    <Col span={7}>
                        <Row>
                            <Col>
                                <Link to={`/tasks/${job.taskId}/jobs/${job.id}`}>{`Job #${job.id}`}</Link>
                            </Col>
                            {
                                job.type === JobType.GROUND_TRUTH && (
                                    <Col offset={1}>
                                        <Tag color='#ED9C00'>Ground truth</Tag>
                                    </Col>
                                )
                            }
                            {/* <Col offset={1}>
                                <Text type='secondary'>{job.state.charAt(0).toUpperCase() + job.state.slice(1)}</Text>
                            </Col> */}
                        </Row>
                        <Row className='cvat-job-item-dates-info'>
                            <Col>
                                <Text>Created on</Text>
                                <Text type='secondary'>{` ${created.format('MMMM Do YYYY HH:MM')}`}</Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Text>Last updated</Text>
                                <Text type='secondary'>{` ${updated.format('MMMM Do YYYY HH:MM')}`}</Text>
                            </Col>
                        </Row>
                    </Col>
                    <Col span={8}>
                        <Row className='cvat-job-item-selects' justify='space-between'>
                            <Col>
                                <Row>
                                    <Col>
                                        <Row>
                                            <Text>Assignee:</Text>
                                        </Row>
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
                                    <Col>
                                        <Row>
                                            <Text>Stage:</Text>
                                        </Row>
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
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                    <Col span={9}>
                        <Row className='cvat-job-item-details'>
                            <Col>
                                <Row>
                                    <Col>
                                        <ProjectOutlined />
                                        <Text>State:</Text>
                                        <Text type='secondary'>{` ${job.state.charAt(0).toUpperCase() + job.state.slice(1)}`}</Text>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Icon component={DurationIcon} />
                                        <Text>Duration:</Text>
                                        <Text type='secondary'>{` ${moment.duration(now.diff(created)).humanize()}`}</Text>
                                    </Col>
                                </Row>
                            </Col>
                            <Col offset={2}>
                                <Row>
                                    <Col>
                                        <Icon component={FrameCountIcon} />
                                        <Text>Frame count:</Text>
                                        <Text type='secondary'>{` ${job.stopFrame - job.startFrame}`}</Text>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Icon component={FramesIcon} />
                                        <Text>Frames:</Text>
                                        <Text type='secondary'>{` ${job.startFrame}-${job.stopFrame}`}</Text>
                                    </Col>
                                </Row>
                            </Col>

                        </Row>
                    </Col>
                </Row>
                <Dropdown overlay={<JobActionsMenu job={job} />}>
                    <MoreOutlined className='cvat-job-item-more-button' />
                </Dropdown>
            </Card>
        </Col>
    );
}

export default React.memo(JobItem);
