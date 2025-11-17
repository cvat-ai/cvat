// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useCallback, useEffect, useState,
} from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import PropTypes from 'prop-types';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Icon from '@ant-design/icons';
import {
    BorderOutlined,
    LoadingOutlined, MoreOutlined, QuestionCircleOutlined,
} from '@ant-design/icons/lib/icons';
import { DurationIcon, FramesIcon } from 'icons';
import {
    Job, JobStage, JobState, JobType, Task, User,
} from 'cvat-core-wrapper';
import { useIsMounted, useContextMenuClick } from 'utils/hooks';
import UserSelector from 'components/task-page/user-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import Collapse from 'antd/lib/collapse';
import CVATTag, { TagType } from 'components/common/cvat-tag';
import JobActionsComponent from 'components/jobs-page/actions-menu';
import { JobStageSelector, JobStateSelector } from './job-selectors';

function formatDate(value: Dayjs): string {
    return value.format('MMM Do YYYY HH:mm');
}

interface Props {
    job: Job;
    task: Task;
    onJobUpdate: (job: Job, fields: Parameters<Job['save']>[0]) => void;
    childJobs?: Job[];
    defaultCollapsed?: boolean;
    onCollapseChange?: (jobID: number, collapsed: boolean) => void;
    selected?: boolean;
    onClick?: (event?: React.MouseEvent) => void;
}

function ReviewSummaryComponent({ jobInstance }: Readonly<{ jobInstance: Job }>): JSX.Element {
    const [summary, setSummary] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState<any>(null);
    const isMounted = useIsMounted();

    useEffect(() => {
        setError(null);
        jobInstance
            .issues(jobInstance.id)
            .then((issues: any[]) => {
                if (isMounted()) {
                    setSummary({
                        issues_unsolved: issues.filter((issue) => !issue.resolved).length,
                        issues_resolved: issues.filter((issue) => issue.resolved).length,
                    });
                }
            })
            .catch((_error: any) => {
                if (isMounted()) {
                    // eslint-disable-next-line
                    console.log(_error);
                    setError(_error);
                }
            });
    }, []);

    if (!summary) {
        if (error) {
            if (error.toString().includes('403')) {
                return <p>You do not have permissions</p>;
            }

            return <p>Could not fetch, check console output</p>;
        }

        return (
            <>
                <p>Loading.. </p>
                <LoadingOutlined />
            </>
        );
    }

    return (
        <table className='cvat-review-summary-description'>
            <tbody>
                <tr>
                    <td>
                        <Text strong>Unsolved issues</Text>
                    </td>
                    <td>{summary.issues_unsolved}</td>
                </tr>
                <tr>
                    <td>
                        <Text strong>Resolved issues</Text>
                    </td>
                    <td>{summary.issues_resolved}</td>
                </tr>
            </tbody>
        </table>
    );
}

function JobItem(props: Readonly<Props>): JSX.Element {
    const {
        job, task, onJobUpdate, childJobs, defaultCollapsed, onCollapseChange, selected, onClick,
    } = props;

    const deletes = useSelector((state: CombinedState) => state.jobs.activities.deletes);
    const deleted = job.id in deletes ? deletes[job.id] === true : false;
    const { itemRef, handleContextMenuClick } = useContextMenuClick<HTMLDivElement>();

    const { stage, state } = job;
    const created = dayjs(job.createdDate);
    const updated = dayjs(job.updatedDate);
    const now = dayjs();

    const style = {};
    if (deleted) {
        (style as any).pointerEvents = 'none';
        (style as any).opacity = 0.5;
    }
    const frameCountPercent = ((job.frameCount / (task.size || 1)) * 100).toFixed(0);
    const frameCountPercentRepresentation = frameCountPercent === '0' ? '<1' : frameCountPercent;
    const jobName = `Job #${job.id}`;

    let childJobViews: React.JSX.Element[] = [];
    if (childJobs && childJobs.length > 0) {
        const sortedChildJobs = [...childJobs].sort((a, b) => a.id - b.id);
        childJobViews = sortedChildJobs.map((eachJob: Job) => (
            <JobItem key={eachJob.id} job={eachJob} task={task} onJobUpdate={onJobUpdate} selected={selected} />
        ));
    }

    let tag = null;
    if (job.type === JobType.GROUND_TRUTH) {
        tag = (
            <Col offset={1}>
                <CVATTag type={TagType.GROUND_TRUTH} />
            </Col>
        );
    } else if (job.consensusReplicas) {
        tag = (
            <Col offset={1}>
                <CVATTag type={TagType.CONSENSUS} />
            </Col>
        );
    }

    const onCollapse = useCallback((keys: string | string[]) => {
        if (onCollapseChange) {
            onCollapseChange(job.id, Array.isArray(keys) ? keys.length === 0 : keys === '');
        }
    }, [onCollapseChange]);

    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    const card = (
        <Card
            ref={itemRef}
            className={`cvat-job-item${selected ? ' cvat-item-selected' : ''}`}
            style={{ ...style }}
            data-row-id={job.id}
            onClick={onClick}
        >
            <Row align='middle'>
                <Col span={6}>
                    <Row>
                        <Col>
                            <Link to={`/tasks/${job.taskId}/jobs/${job.id}`}>{jobName}</Link>
                        </Col>
                        {tag}
                        {job.type !== JobType.GROUND_TRUTH && (
                            <Col className='cvat-job-item-issues-summary-icon'>
                                <CVATTooltip title={<ReviewSummaryComponent jobInstance={job} />}>
                                    <QuestionCircleOutlined />
                                </CVATTooltip>
                            </Col>
                        )}
                    </Row>
                    <Row className='cvat-job-item-dates-info'>
                        <Col>
                            <Text>Created: </Text>
                            <Text type='secondary'>{`${formatDate(created)}`}</Text>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Text>Updated: </Text>
                            <Text type='secondary'>{`${formatDate(updated)}`}</Text>
                        </Col>
                    </Row>
                </Col>
                <Col span={12}>
                    <Row className='cvat-job-item-selects' justify='space-between'>
                        <Col>
                            <Row>
                                <Col className='cvat-job-item-select'>
                                    <Row>
                                        <Text>Assignee:</Text>
                                    </Row>
                                    <UserSelector
                                        className='cvat-job-assignee-selector'
                                        value={job.assignee}
                                        onSelect={(user: User | null): void => {
                                            if (job?.assignee?.id === user?.id) return;
                                            onJobUpdate(job, { assignee: user });
                                        }}
                                    />
                                </Col>
                                <Col className='cvat-job-item-select'>
                                    <Row justify='space-between' align='middle'>
                                        <Col>
                                            <Text>Stage:</Text>
                                        </Col>
                                    </Row>
                                    <JobStageSelector
                                        value={stage}
                                        onSelect={(newValue: JobStage) => {
                                            onJobUpdate(job, { stage: newValue });
                                        }}
                                    />
                                </Col>
                                <Col className='cvat-job-item-select'>
                                    <Row justify='space-between' align='middle'>
                                        <Col>
                                            <Text>State:</Text>
                                        </Col>
                                    </Row>
                                    <JobStateSelector
                                        value={state}
                                        onSelect={(newValue: JobState) => {
                                            onJobUpdate(job, { state: newValue });
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col span={5} offset={1}>
                    <Row className='cvat-job-item-details'>
                        <Col>
                            <Row>
                                <Col>
                                    <Icon component={DurationIcon} />
                                    <Text>Duration: </Text>
                                    <Text type='secondary'>
                                        {`${dayjs
                                            .duration(now.diff(created))
                                            .humanize()}`}
                                    </Text>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <BorderOutlined />
                                    <Text>Frame count: </Text>
                                    <Text type='secondary' className='cvat-job-item-frames'>
                                        {`${job.frameCount} (${frameCountPercentRepresentation}%)`}
                                    </Text>
                                </Col>
                            </Row>
                            {job.type !== JobType.GROUND_TRUTH && (
                                <Row>
                                    <Col>
                                        <Icon component={FramesIcon} />
                                        <Text>Frame range: </Text>
                                        <Text type='secondary' className='cvat-job-item-frame-range'>
                                            {`${job.startFrame}-${job.stopFrame}`}
                                        </Text>
                                    </Col>
                                </Row>
                            )}
                        </Col>
                    </Row>
                </Col>
            </Row>
            <div
                onClick={handleContextMenuClick}
                className='cvat-job-item-more-button cvat-actions-menu-button'
            >
                <MoreOutlined className='cvat-menu-icon' />
            </div>
            {childJobViews.length > 0 && (
                <Collapse
                    className='cvat-consensus-job-collapse'
                    defaultActiveKey={defaultCollapsed ? [] : ['1']}
                    onChange={onCollapse}
                    items={[
                        {
                            key: '1',
                            label: <Text>{`${childJobViews.length} Replicas`}</Text>,
                            children: childJobViews,
                        },
                    ]}
                />
            )}
        </Card>
    );

    return (
        <Col span={24}>
            {
                job.parentJobId === null ? (
                    <JobActionsComponent
                        jobInstance={job}
                        consensusJobsPresent={(childJobs as Job[]).length > 0}
                        dropdownTrigger={['contextMenu']}
                        triggerElement={card}
                    />
                ) : card
            }
        </Col>
    );
}

JobItem.defaultProps = {
    childJobs: [],
};

JobItem.propTypes = {
    childJobs: PropTypes.arrayOf(PropTypes.instanceOf(Job)),
};

export default React.memo(JobItem);
