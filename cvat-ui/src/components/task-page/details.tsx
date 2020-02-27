// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Tag,
    Icon,
    Modal,
    Button,
    notification,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import moment from 'moment';

import getCore from 'cvat-core';
import patterns from 'utils/validation-patterns';
import { getReposData, syncRepos } from 'utils/git-utils';
import UserSelector from './user-selector';
import LabelsEditorComponent from '../labels-editor/labels-editor';

const core = getCore();

interface Props {
    previewImage: string;
    taskInstance: any;
    installedGit: boolean; // change to git repos url
    registeredUsers: any[];
    onTaskUpdate: (taskInstance: any) => void;
}

interface State {
    name: string;
    bugTracker: string;
    repository: string;
    repositoryStatus: string;
}

export default class DetailsComponent extends React.PureComponent<Props, State> {
    private mounted: boolean;

    constructor(props: Props) {
        super(props);

        const { taskInstance } = props;

        this.mounted = false;
        this.state = {
            name: taskInstance.name,
            bugTracker: taskInstance.bugTracker,
            repository: '',
            repositoryStatus: '',
        };
    }

    public componentDidMount(): void {
        const { taskInstance } = this.props;
        this.mounted = true;

        getReposData(taskInstance.id)
            .then((data): void => {
                if (data !== null && this.mounted) {
                    if (data.status.error) {
                        notification.error({
                            message: 'Could not receive repository status',
                            description: data.status.error,
                        });
                    } else {
                        this.setState({
                            repositoryStatus: data.status.value,
                        });
                    }

                    this.setState({
                        repository: data.url,
                    });
                }
            }).catch((error): void => {
                if (this.mounted) {
                    notification.error({
                        message: 'Could not receive repository status',
                        description: error.toString(),
                    });
                }
            });
    }


    public componentDidUpdate(prevProps: Props): void {
        const { taskInstance } = this.props;

        if (prevProps !== this.props) {
            this.setState({
                name: taskInstance.name,
                bugTracker: taskInstance.bugTracker,
            });
        }
    }

    public componentWillUnmount(): void {
        this.mounted = false;
    }

    private renderTaskName(): JSX.Element {
        const { name } = this.state;
        const {
            taskInstance,
            onTaskUpdate,
        } = this.props;

        return (
            <Title
                level={4}
                editable={{
                    onChange: (value: string): void => {
                        this.setState({
                            name: value,
                        });

                        taskInstance.name = value;
                        onTaskUpdate(taskInstance);
                    },
                }}
                className='cvat-text-color'
            >
                {name}
            </Title>
        );
    }

    private renderPreview(): JSX.Element {
        const { previewImage } = this.props;
        return (
            <div className='cvat-task-preview-wrapper'>
                <img alt='Preview' className='cvat-task-preview' src={previewImage} />
            </div>
        );
    }

    private renderParameters(): JSX.Element {
        const { taskInstance } = this.props;
        const { overlap } = taskInstance;
        const { segmentSize } = taskInstance;
        const { imageQuality } = taskInstance;
        const zOrder = taskInstance.zOrder.toString();

        return (
            <>
                <Row type='flex' justify='start' align='middle'>
                    <Col span={12}>
                        <Text strong className='cvat-text-color'>Overlap size</Text>
                        <br />
                        <Text className='cvat-text-color'>{overlap}</Text>
                    </Col>
                    <Col span={12}>
                        <Text strong className='cvat-text-color'>Segment size</Text>
                        <br />
                        <Text className='cvat-text-color'>{segmentSize}</Text>
                    </Col>
                </Row>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={12}>
                        <Text strong className='cvat-text-color'>Image quality</Text>
                        <br />
                        <Text className='cvat-text-color'>{imageQuality}</Text>
                    </Col>
                    <Col span={12}>
                        <Text strong className='cvat-text-color'>Z-order</Text>
                        <br />
                        <Text className='cvat-text-color'>{zOrder}</Text>
                    </Col>
                </Row>
            </>
        );
    }

    private renderUsers(): JSX.Element {
        const {
            taskInstance,
            registeredUsers,
            onTaskUpdate,
        } = this.props;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const assignee = taskInstance.assignee ? taskInstance.assignee.username : null;
        const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');
        const assigneeSelect = (
            <UserSelector
                users={registeredUsers}
                value={assignee}
                onChange={
                    (value: string): void => {
                        let [userInstance] = registeredUsers
                            .filter((user: any) => user.username === value);

                        if (userInstance === undefined) {
                            userInstance = null;
                        }

                        taskInstance.assignee = userInstance;
                        onTaskUpdate(taskInstance);
                    }
                }
            />
        );

        return (
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={12}>
                    { owner && (
                        <Text type='secondary'>
                            {`Created by ${owner} on ${created}`}
                        </Text>
                    )}
                </Col>
                <Col span={10}>
                    <Text type='secondary'>
                        Assigned to
                        { assigneeSelect }
                    </Text>
                </Col>
            </Row>
        );
    }

    private renderDatasetRepository(): JSX.Element | boolean {
        const { taskInstance } = this.props;
        const {
            repository,
            repositoryStatus,
        } = this.state;

        return (
            !!repository
                && (
                    <Row>
                        <Col className='cvat-dataset-repository-url'>
                            <Text strong className='cvat-text-color'>Dataset Repository</Text>
                            <br />
                            <a href={repository} rel='noopener noreferrer' target='_blank'>{repository}</a>
                            {repositoryStatus === 'sync'
                                && (
                                    <Tag color='blue'>
                                        <Icon type='check-circle' />
                                        Synchronized
                                    </Tag>
                                )}
                            {repositoryStatus === 'merged'
                                && (
                                    <Tag color='green'>
                                        <Icon type='check-circle' />
                                        Merged
                                    </Tag>
                                )}
                            {repositoryStatus === 'syncing'
                                && (
                                    <Tag color='purple'>
                                        <Icon type='loading' />
                                        Syncing
                                    </Tag>
                                )}
                            {repositoryStatus === '!sync'
                                && (
                                    <Tag
                                        color='red'
                                        onClick={(): void => {
                                            this.setState({
                                                repositoryStatus: 'syncing',
                                            });

                                            syncRepos(taskInstance.id).then((): void => {
                                                if (this.mounted) {
                                                    this.setState({
                                                        repositoryStatus: 'sync',
                                                    });
                                                }
                                            }).catch((): void => {
                                                if (this.mounted) {
                                                    this.setState({
                                                        repositoryStatus: '!sync',
                                                    });
                                                }
                                            });
                                        }}
                                    >
                                        <Icon type='warning' />
                                        Synchronize
                                    </Tag>
                                )}
                        </Col>
                    </Row>
                )
        );
    }

    private renderBugTracker(): JSX.Element {
        const {
            taskInstance,
            onTaskUpdate,
        } = this.props;
        const { bugTracker } = this.state;

        let shown = false;
        const onChangeValue = (value: string): void => {
            if (value && !patterns.validateURL.pattern.test(value)) {
                if (!shown) {
                    Modal.error({
                        title: `Could not update the task ${taskInstance.id}`,
                        content: 'Issue tracker is expected to be URL',
                        onOk: (() => {
                            shown = false;
                        }),
                    });
                    shown = true;
                }
            } else {
                this.setState({
                    bugTracker: value,
                });

                taskInstance.bugTracker = value;
                onTaskUpdate(taskInstance);
            }
        };

        if (bugTracker) {
            return (
                <Row>
                    <Col>
                        <Text strong className='cvat-text-color'>Issue Tracker</Text>
                        <br />
                        <Text editable={{ onChange: onChangeValue }}>{bugTracker}</Text>
                        <Button
                            type='ghost'
                            size='small'
                            onClick={(): void => {
                                // false positive
                                // eslint-disable-next-line
                                window.open(bugTracker, '_blank');
                            }}
                            className='cvat-open-bug-tracker-button'
                        >
                                Open the issue
                        </Button>
                    </Col>
                </Row>
            );
        }

        return (
            <Row>
                <Col>
                    <Text strong className='cvat-text-color'>Issue Tracker</Text>
                    <br />
                    <Text editable={{ onChange: onChangeValue }}>Not specified</Text>
                </Col>
            </Row>
        );
    }

    private renderLabelsEditor(): JSX.Element {
        const {
            taskInstance,
            onTaskUpdate,
        } = this.props;

        return (
            <Row>
                <Col>
                    <LabelsEditorComponent
                        labels={taskInstance.labels.map(
                            (label: any): string => label.toJSON(),
                        )}
                        onSubmit={(labels: any[]): void => {
                            taskInstance.labels = labels
                                .map((labelData): any => new core.classes.Label(labelData));
                            onTaskUpdate(taskInstance);
                        }}
                    />
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        return (
            <div className='cvat-task-details'>
                <Row type='flex' justify='start' align='middle'>
                    <Col>
                        { this.renderTaskName() }
                    </Col>
                </Row>
                <Row type='flex' justify='space-between' align='top'>
                    <Col md={8} lg={7} xl={7} xxl={6}>
                        <Row type='flex' justify='start' align='middle'>
                            <Col span={24}>
                                { this.renderPreview() }
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                { this.renderParameters() }
                            </Col>
                        </Row>
                    </Col>
                    <Col md={16} lg={17} xl={17} xxl={18}>
                        { this.renderUsers() }
                        { this.renderBugTracker() }
                        { this.renderDatasetRepository() }
                        { this.renderLabelsEditor() }
                    </Col>
                </Row>
            </div>
        );
    }
}
