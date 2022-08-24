// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import moment from 'moment';
import Paragraph from 'antd/lib/typography/Paragraph';
import Select from 'antd/lib/select';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { getCore } from 'cvat-core-wrapper';
import { getReposData, syncRepos, changeRepo } from 'utils/git-utils';
import { ActiveInference } from 'reducers';
import AutomaticAnnotationProgress from 'components/tasks-page/automatic-annotation-progress';
import Descriptions from 'antd/lib/descriptions';
import Space from 'antd/lib/space';
import UserSelector, { User } from './user-selector';
import BugTrackerEditor from './bug-tracker-editor';
import LabelsEditorComponent from '../labels-editor/labels-editor';
import ProjectSubsetField from '../create-task-page/project-subset-field';

const { Option } = Select;

const core = getCore();

interface Props {
    previewImage: string;
    taskInstance: any;
    installedGit: boolean; // change to git repos url
    activeInference: ActiveInference | null;
    projectSubsets: string[];
    cancelAutoAnnotation(): void;
    onTaskUpdate: (taskInstance: any) => void;
    dumpers: any[];
    user: any;
}

interface State {
    name: string;
    subset: string;
    repository: string;
    repositoryStatus: string;
    format: string;
    lfs: boolean;
    updatingRepository: boolean;
}

export default class DetailsComponent extends React.PureComponent<Props, State> {
    private mounted: boolean;
    private previewImageElement: HTMLImageElement;
    private previewWrapperRef: React.RefObject<HTMLDivElement>;

    constructor(props: Props) {
        super(props);

        const { taskInstance } = props;

        this.mounted = false;
        this.previewImageElement = new Image();
        this.previewWrapperRef = React.createRef<HTMLDivElement>();
        this.state = {
            name: taskInstance.name,
            subset: taskInstance.subset,
            repository: '',
            format: '',
            repositoryStatus: '',
            lfs: false,
            updatingRepository: false,
        };
    }

    public componentDidMount(): void {
        const { taskInstance, previewImage } = this.props;
        const { previewImageElement, previewWrapperRef } = this;
        this.mounted = true;

        previewImageElement.onload = () => {
            const { height, width } = previewImageElement;
            if (width > height) {
                previewImageElement.style.width = '100%';
            } else {
                previewImageElement.style.height = '100%';
            }
        };

        previewImageElement.src = previewImage;
        previewImageElement.alt = 'Preview';
        if (previewWrapperRef.current) {
            previewWrapperRef.current.appendChild(previewImageElement);
        }

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
                        format: data.format,
                        lfs: !!data.lfs,
                    });
                }
            })
            .catch((error): void => {
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
            });
        }
    }

    public componentWillUnmount(): void {
        this.mounted = false;
    }

    private onChangeRepoValue = (value: string): void => {
        const { taskInstance } = this.props;
        const { repository } = this.state;
        const old = repository;
        this.setState({ repository: value, updatingRepository: true });
        changeRepo(taskInstance.id, 'url', value)
            .catch((error) => {
                this.setState({ repository: old });
                notification.error({
                    message: 'Could not update repository',
                    description: error,
                });
            })
            .finally(() => this.setState({ updatingRepository: false }));
    };

    private onChangeLFSValue = (event: CheckboxChangeEvent): void => {
        const { taskInstance } = this.props;
        const { lfs } = this.state;
        const old = lfs;
        this.setState({ lfs: event.target.checked, updatingRepository: true });
        changeRepo(taskInstance.id, 'lfs', event.target.checked)
            .catch((error) => {
                this.setState({ lfs: old });
                notification.error({
                    message: 'Could not update LFS',
                    description: error,
                });
            })
            .finally(() => this.setState({ updatingRepository: false }));
    };

    private onChangeFormatValue = (value: string): void => {
        const { taskInstance } = this.props;
        const { format } = this.state;
        const old = format;
        this.setState({ format: value, updatingRepository: true });
        changeRepo(taskInstance.id, 'format', value)
            .catch((error) => {
                this.setState({ format: old });
                notification.error({
                    message: 'Could not update format',
                    description: error,
                });
            })
            .finally(() => this.setState({ updatingRepository: false }));
    };

    private renderTaskName(): JSX.Element {
        const { name } = this.state;
        const { taskInstance, onTaskUpdate } = this.props;

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
        const { previewWrapperRef } = this;

        // Add image on mount after get its width and height to fit it into wrapper
        return <div ref={previewWrapperRef} className='cvat-task-preview-wrapper' />;
    }

    private renderParameters(): JSX.Element {
        const { taskInstance } = this.props;
        const { overlap, segmentSize, imageQuality } = taskInstance;

        return (
            <Descriptions className='cvat-task-parameters' bordered layout='vertical' size='small'>
                <Descriptions.Item label='Overlap size'>{overlap}</Descriptions.Item>
                <Descriptions.Item label='Segment size'>{segmentSize}</Descriptions.Item>
                <Descriptions.Item label='Image quality'>{imageQuality}</Descriptions.Item>
            </Descriptions>
        );
    }

    private renderDescription(): JSX.Element {
        const { taskInstance, onTaskUpdate } = this.props;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const assignee = taskInstance.assignee ? taskInstance.assignee : null;
        const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');
        const assigneeSelect = (
            <UserSelector
                value={assignee}
                onSelect={(value: User | null): void => {
                    if (taskInstance?.assignee?.id === value?.id) return;
                    taskInstance.assignee = value;
                    onTaskUpdate(taskInstance);
                }}
            />
        );

        return (
            <Row className='cvat-task-details-user-block' justify='space-between' align='middle'>
                <Col span={12}>
                    {owner && (
                        <Text type='secondary'>{`Task #${taskInstance.id} Created by ${owner} on ${created}`}</Text>
                    )}
                </Col>
                <Col span={10}>
                    <Text type='secondary'>Assigned to</Text>
                    {assigneeSelect}
                </Col>
            </Row>
        );
    }

    private renderDatasetRepository(): JSX.Element | boolean {
        const { taskInstance, dumpers } = this.props;
        const {
            repository, repositoryStatus, format, lfs, updatingRepository,
        } = this.state;
        return (
            !!repository && (
                <Row>
                    <Col className='cvat-dataset-repository-url'>
                        <Text strong className='cvat-text-color'>
                            Dataset Repository
                        </Text>
                        <Paragraph>
                            <Text editable={{ onChange: this.onChangeRepoValue }} disabled={updatingRepository}>
                                {repository}
                            </Text>
                            {repositoryStatus === 'sync' && (
                                <Tag color='blue'>
                                    <CheckCircleOutlined />
                                    Synchronized
                                </Tag>
                            )}
                            {repositoryStatus === 'merged' && (
                                <Tag color='green'>
                                    <CheckCircleOutlined />
                                    Merged
                                </Tag>
                            )}
                            {repositoryStatus === 'syncing' && (
                                <Tag color='purple'>
                                    <LoadingOutlined />
                                    Syncing
                                </Tag>
                            )}
                            {repositoryStatus === '!sync' && (
                                <Tag
                                    color='red'
                                    onClick={(): void => {
                                        this.setState({
                                            repositoryStatus: 'syncing',
                                        });

                                        syncRepos(taskInstance.id)
                                            .then((): void => {
                                                if (this.mounted) {
                                                    this.setState({
                                                        repositoryStatus: 'sync',
                                                    });
                                                }
                                            })
                                            .catch((error): void => {
                                                if (this.mounted) {
                                                    Modal.error({
                                                        width: 800,
                                                        title: 'Could not synchronize the repository',
                                                        content: error.toString(),
                                                    });

                                                    this.setState({
                                                        repositoryStatus: '!sync',
                                                    });
                                                }
                                            });
                                    }}
                                >
                                    <ExclamationCircleOutlined />
                                    Synchronize
                                </Tag>
                            )}
                        </Paragraph>
                        <Text strong className='cvat-text-color'>Using format: </Text>
                        <Space>
                            <Select disabled={updatingRepository} onChange={this.onChangeFormatValue} className='cvat-repository-format-select' value={format}>
                                {
                                    dumpers.map((dumper: any) => (
                                        <Option key={dumper.name} value={dumper.name}>{dumper.name}</Option>
                                    ))
                                }
                            </Select>
                            <Checkbox disabled={updatingRepository} onChange={this.onChangeLFSValue} checked={lfs}>
                                Large file support
                            </Checkbox>
                            {updatingRepository && <LoadingOutlined style={{ fontSize: 14 }} spin />}
                        </Space>
                    </Col>
                </Row>
            )
        );
    }

    private renderLabelsEditor(): JSX.Element {
        const { taskInstance, onTaskUpdate } = this.props;

        return (
            <Row>
                <Col span={24}>
                    <LabelsEditorComponent
                        labels={taskInstance.labels.map((label: any): string => label.toJSON())}
                        onSubmit={(labels: any[]): void => {
                            taskInstance.labels = labels.map((labelData): any => new core.classes.Label(labelData));
                            onTaskUpdate(taskInstance);
                        }}
                    />
                </Col>
            </Row>
        );
    }

    private renderSubsetField(): JSX.Element {
        const { subset } = this.state;
        const { taskInstance, projectSubsets, onTaskUpdate } = this.props;

        return (
            <Row>
                <Col span={24}>
                    <Text className='cvat-text-color'>Subset:</Text>
                </Col>
                <Col span={24}>
                    <ProjectSubsetField
                        value={subset}
                        projectId={taskInstance.projectId}
                        projectSubsets={projectSubsets}
                        onChange={(value) => {
                            this.setState({
                                subset: value,
                            });

                            if (taskInstance.subset !== value) {
                                taskInstance.subset = value;
                                onTaskUpdate(taskInstance);
                            }
                        }}
                    />
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const {
            activeInference, cancelAutoAnnotation, taskInstance, onTaskUpdate,
        } = this.props;

        return (
            <div className='cvat-task-details'>
                <Row justify='start' align='middle'>
                    <Col className='cvat-task-details-task-name'>{this.renderTaskName()}</Col>
                </Row>
                <Row justify='space-between' align='top'>
                    <Col md={8} lg={7} xl={7} xxl={6}>
                        <Row justify='start' align='middle'>
                            <Col span={24}>{this.renderPreview()}</Col>
                        </Row>
                        <Row>
                            <Col span={24}>{this.renderParameters()}</Col>
                        </Row>
                    </Col>
                    <Col md={16} lg={17} xl={17} xxl={18}>
                        {this.renderDescription()}
                        <Row justify='space-between' align='middle'>
                            <Col span={12}>
                                <BugTrackerEditor
                                    instance={taskInstance}
                                    onChange={(bugTracker) => {
                                        taskInstance.bugTracker = bugTracker;
                                        onTaskUpdate(taskInstance);
                                    }}
                                />
                            </Col>
                            <Col span={10}>
                                <AutomaticAnnotationProgress
                                    activeInference={activeInference}
                                    cancelAutoAnnotation={cancelAutoAnnotation}
                                />
                            </Col>
                        </Row>
                        {this.renderDatasetRepository()}
                        {!taskInstance.projectId && this.renderLabelsEditor()}
                        {taskInstance.projectId && this.renderSubsetField()}
                    </Col>
                </Row>
            </div>
        );
    }
}
