// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import { LoadingOutlined, QuestionCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { ColumnFilterItem } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';
import copy from 'copy-to-clipboard';

import { JobStage } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import UserSelector, { User } from './user-selector';

interface Props {
    taskInstance: any;
    onJobUpdate(jobInstance: any): void;
}

function ReviewSummaryComponent({ jobInstance }: { jobInstance: any }): JSX.Element {
    const [summary, setSummary] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState<any>(null);
    useEffect(() => {
        setError(null);
        jobInstance
            .issues(jobInstance.id)
            .then((issues: any[]) => {
                setSummary({
                    issues_unsolved: issues.filter((issue) => !issue.resolved_date).length,
                    issues_resolved: issues.filter((issue) => issue.resolved_date).length,
                });
            })
            .catch((_error: any) => {
                // eslint-disable-next-line
                console.log(_error);
                setError(_error);
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

function JobListComponent(props: Props & RouteComponentProps): JSX.Element {
    const {
        taskInstance,
        onJobUpdate,
        history: { push },
    } = props;

    const { jobs, id: taskId } = taskInstance;

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
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            push(`/tasks/${taskId}/jobs/${id}`);
                        }}
                        href={`/tasks/${taskId}/jobs/${id}`}
                    >
                        {`Job #${id}`}
                    </Button>
                </div>
            ),
        },
        {
            title: 'Frames',
            dataIndex: 'frames',
            key: 'frames',
            className: 'cvat-text-color cvat-job-item-frames',
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
                        <Select
                            value={stage}
                            onChange={(newValue: string) => {
                                jobInstance.stage = newValue;
                                onJobUpdate(jobInstance);
                            }}
                        >
                            <Select.Option value={JobStage.ANNOTATION}>{JobStage.ANNOTATION}</Select.Option>
                            <Select.Option value={JobStage.REVIEW}>{JobStage.REVIEW}</Select.Option>
                            <Select.Option value={JobStage.ACCEPTANCE}>{JobStage.ACCEPTANCE}</Select.Option>
                        </Select>
                        <CVATTooltip title={<ReviewSummaryComponent jobInstance={jobInstance} />}>
                            <QuestionCircleOutlined />
                        </CVATTooltip>
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
            title: 'State',
            dataIndex: 'state',
            key: 'state',
            className: 'cvat-job-item-state',
            render: (jobInstance: any): JSX.Element => {
                const { state } = jobInstance;
                return (
                    <Text type='secondary'>
                        {state}
                    </Text>
                );
            },
            sorter: sorter('state.state'),
            filters: [
                { text: 'new', value: 'new' },
                { text: 'in progress', value: 'in progress' },
                { text: 'completed', value: 'completed' },
                { text: 'rejected', value: 'rejected' },
            ],
            onFilter: (value: string | number | boolean, record: any) => record.state.state === value,
        },
        {
            title: 'Started on',
            dataIndex: 'started',
            key: 'started',
            className: 'cvat-text-color',
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            className: 'cvat-text-color',
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            className: 'cvat-job-item-assignee',
            render: (jobInstance: any): JSX.Element => (
                <UserSelector
                    className='cvat-job-assignee-selector'
                    value={jobInstance.assignee}
                    onSelect={(value: User | null): void => {
                        if (jobInstance?.assignee?.id === value?.id) return;
                        jobInstance.assignee = value;
                        onJobUpdate(jobInstance);
                    }}
                />
            ),
            sorter: sorter('assignee.assignee.username'),
            filters: collectUsers('assignee'),
            onFilter: (value: string | number | boolean, record: any) => (
                record.assignee.assignee?.username || false
            ) === value,
        },
    ];

    let completed = 0;
    const data = jobs.reduce((acc: any[], job: any) => {
        if (job.stage === 'acceptance') {
            completed++;
        }

        const created = moment(taskInstance.createdDate);

        const now = moment(moment.now());
        acc.push({
            key: job.id,
            job: job.id,
            frames: `${job.startFrame}-${job.stopFrame}`,
            state: job,
            stage: job,
            started: `${created.format('MMMM Do YYYY HH:MM')}`,
            duration: `${moment.duration(now.diff(created)).humanize()}`,
            assignee: job,
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
                <Col>
                    <Text className='cvat-text-color'>{`${completed} of ${data.length} jobs`}</Text>
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

export default withRouter(JobListComponent);
