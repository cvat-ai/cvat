// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Icon,
    Progress,
    Dropdown,
    Tooltip,
    Modal,
} from 'antd';

import moment from 'moment';

import ActionsMenuContainer from 'containers/actions-menu/actions-menu';
import { ActiveInference } from 'reducers/interfaces';
import { MenuIcon } from 'icons';

export interface TaskItemProps {
    taskInstance: any;
    previewImage: string;
    deleted: boolean;
    hidden: boolean;
    activeInference: ActiveInference | null;
    cancelAutoAnnotation(): void;
}

class TaskItemComponent extends React.PureComponent<TaskItemProps & RouteComponentProps> {
    private renderPreview(): JSX.Element {
        const { previewImage } = this.props;
        return (
            <Col span={4}>
                <div className='cvat-task-item-preview-wrapper'>
                    <img alt='Preview' className='cvat-task-item-preview' src={previewImage} />
                </div>
            </Col>
        );
    }

    private renderDescription(): JSX.Element {
        // Task info
        const { taskInstance } = this.props;
        const { id } = taskInstance;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const updated = moment(taskInstance.updatedDate).fromNow();
        const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');

        // Get and truncate a task name
        const name = `${taskInstance.name.substring(0, 70)}${taskInstance.name.length > 70 ? '...' : ''}`;

        return (
            <Col span={10} className='cvat-task-item-description'>
                <Text strong type='secondary'>{`#${id}: `}</Text>
                <Text strong className='cvat-text-color'>{name}</Text>
                <br />
                { owner
                    && (
                        <>
                            <Text type='secondary'>
                                {`Created ${owner ? `by ${owner}` : ''} on ${created}`}
                            </Text>
                            <br />
                        </>
                    )}
                <Text type='secondary'>{`Last updated ${updated}`}</Text>
            </Col>
        );
    }

    private renderProgress(): JSX.Element {
        const {
            taskInstance,
            activeInference,
            cancelAutoAnnotation,
        } = this.props;
        // Count number of jobs and performed jobs
        const numOfJobs = taskInstance.jobs.length;
        const numOfCompleted = taskInstance.jobs.filter(
            (job: any): boolean => job.status === 'completed',
        ).length;

        // Progress appearence depends on number of jobs
        let progressColor = null;
        let progressText = null;
        if (numOfCompleted === numOfJobs) {
            progressColor = 'cvat-task-completed-progress';
            progressText = <Text strong className={progressColor}>Completed</Text>;
        } else if (numOfCompleted) {
            progressColor = 'cvat-task-progress-progress';
            progressText = <Text strong className={progressColor}>In Progress</Text>;
        } else {
            progressColor = 'cvat-task-pending-progress';
            progressText = <Text strong className={progressColor}>Pending</Text>;
        }

        const jobsProgress = numOfCompleted / numOfJobs;

        return (
            <Col span={6}>
                <Row type='flex' justify='space-between' align='top'>
                    <Col>
                        <svg height='8' width='8' className={progressColor}>
                            <circle cx='4' cy='4' r='4' strokeWidth='0' />
                        </svg>
                        { progressText }
                    </Col>
                    <Col>
                        <Text type='secondary'>{`${numOfCompleted} of ${numOfJobs} jobs`}</Text>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Progress
                            className={`${progressColor} cvat-task-progress`}
                            percent={jobsProgress * 100}
                            strokeColor='#1890FF'
                            showInfo={false}
                            strokeWidth={5}
                            size='small'
                        />
                    </Col>
                </Row>
                { activeInference
                    && (
                        <>
                            <Row>
                                <Col>
                                    <Text strong>Automatic annotation</Text>
                                </Col>
                            </Row>
                            <Row type='flex' justify='space-between'>
                                <Col span={22}>
                                    <Progress
                                        percent={Math.floor(activeInference.progress)}
                                        strokeColor={{
                                            from: '#108ee9',
                                            to: '#87d068',
                                        }}
                                        showInfo={false}
                                        strokeWidth={5}
                                        size='small'
                                    />
                                </Col>
                                <Col span={1} className='close-auto-annotation-icon'>
                                    <Tooltip title='Cancel automatic annotation'>
                                        <Icon
                                            type='close'
                                            onClick={() => {
                                                Modal.confirm({
                                                    title: 'You are going to cancel automatic annotation?',
                                                    content: 'Reached progress will be lost. Continue?',
                                                    okType: 'danger',
                                                    onOk() {
                                                        cancelAutoAnnotation();
                                                    },
                                                });
                                            }}
                                        />
                                    </Tooltip>
                                </Col>
                            </Row>
                        </>
                    )}
            </Col>
        );
    }

    private renderNavigation(): JSX.Element {
        const {
            taskInstance,
            history,
        } = this.props;
        const { id } = taskInstance;

        return (
            <Col span={4}>
                <Row type='flex' justify='end'>
                    <Col>
                        <Button
                            className='cvat-item-open-task-button'
                            type='primary'
                            size='large'
                            ghost
                            onClick={(): void => history.push(`/tasks/${id}`)}
                        >
                            Open
                        </Button>
                    </Col>
                </Row>
                <Row type='flex' justify='end'>
                    <Col className='cvat-item-open-task-actions'>
                        <Text className='cvat-text-color'>Actions</Text>
                        <Dropdown overlay={<ActionsMenuContainer taskInstance={taskInstance} />}>
                            <Icon className='cvat-menu-icon' component={MenuIcon} />
                        </Dropdown>
                    </Col>
                </Row>
            </Col>
        );
    }

    public render(): JSX.Element {
        const {
            deleted,
            hidden,
        } = this.props;
        const style = {};
        if (deleted) {
            (style as any).pointerEvents = 'none';
            (style as any).opacity = 0.5;
        }

        if (hidden) {
            (style as any).display = 'none';
        }

        return (
            <Row className='cvat-tasks-list-item' type='flex' justify='center' align='top' style={{ ...style }}>
                {this.renderPreview()}
                {this.renderDescription()}
                {this.renderProgress()}
                {this.renderNavigation()}
            </Row>
        );
    }
}

export default withRouter(TaskItemComponent);
