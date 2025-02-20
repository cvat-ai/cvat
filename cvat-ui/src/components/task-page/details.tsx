// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import moment from 'moment';

import {
    User, getCore, Project, Task,
} from 'cvat-core-wrapper';
import AutomaticAnnotationProgress from 'components/tasks-page/automatic-annotation-progress';
import MdGuideControl from 'components/md-guide/md-guide-control';
import Preview from 'components/common/preview';
import { cancelInferenceAsync } from 'actions/models-actions';
import { CombinedState, ActiveInference } from 'reducers';
import CVATTag, { TagType } from 'components/common/cvat-tag';
import UserSelector from './user-selector';
import BugTrackerEditor from './bug-tracker-editor';
import LabelsEditorComponent from '../labels-editor/labels-editor';
import ProjectSubsetField from '../create-task-page/project-subset-field';

interface OwnProps {
    task: Task;
    onUpdateTask: (task: Task) => Promise<void>;
}

interface StateToProps {
    activeInference: ActiveInference | null;
    project?: Project;
}

interface DispatchToProps {
    cancelAutoAnnotation(): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps & OwnProps {
    return {
        ...own,
        activeInference: state.models.inferences[own.task.id] || null,
        project: state.projects.current.find((project) => project.id === own.task.projectId),
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    return {
        cancelAutoAnnotation(): void {
            dispatch(cancelInferenceAsync(own.task.id));
        },
    };
}

const core = getCore();

interface State {
    name: string;
    subset: string;
    consensusEnabled: boolean;
}

type Props = DispatchToProps & StateToProps & OwnProps;

class DetailsComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        const { task: taskInstance } = props;
        this.state = {
            name: taskInstance.name,
            subset: taskInstance.subset,
            consensusEnabled: taskInstance.consensusEnabled,
        };
    }

    public componentDidUpdate(prevProps: Props): void {
        const { task: taskInstance } = this.props;

        if (prevProps !== this.props) {
            this.setState({
                name: taskInstance.name,
            });
        }
    }

    private renderTaskName(): JSX.Element {
        const { name } = this.state;
        const { task: taskInstance, onUpdateTask } = this.props;
        const taskName = name;

        return (
            <Row>
                <Col>
                    <Title
                        level={4}
                        editable={{
                            onChange: (value: string): void => {
                                this.setState({
                                    name: value,
                                });

                                taskInstance.name = value;
                                onUpdateTask(taskInstance);
                            },
                        }}
                        className='cvat-text-color cvat-task-name'
                    >
                        {taskName}
                    </Title>
                </Col>
            </Row>
        );
    }

    private renderDescription(): JSX.Element {
        const { task: taskInstance, onUpdateTask } = this.props;
        const { consensusEnabled } = this.state;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const assignee = taskInstance.assignee ? taskInstance.assignee : null;
        const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');
        const assigneeSelect = (
            <UserSelector
                value={assignee}
                onSelect={(value: User | null): void => {
                    if (taskInstance?.assignee?.id === value?.id) return;
                    taskInstance.assignee = value;
                    onUpdateTask(taskInstance);
                }}
            />
        );

        return (
            <Row className='cvat-task-details-user-block' justify='space-between' align='middle'>
                <Col span={12}>
                    {owner && (
                        <div>
                            <Text type='secondary'>
                                {`Task #${taskInstance.id} Created by ${owner} on ${created}`}
                            </Text>
                        </div>
                    )}
                    {consensusEnabled && <CVATTag type={TagType.CONSENSUS} />}
                </Col>
                <Col>
                    <Text type='secondary'>Assigned to</Text>
                    {assigneeSelect}
                </Col>
            </Row>
        );
    }

    private renderLabelsEditor(): JSX.Element {
        const { task: taskInstance, onUpdateTask } = this.props;

        return (
            <Row>
                <Col span={24}>
                    <LabelsEditorComponent
                        labels={taskInstance.labels.map((label: any): string => label.toJSON())}
                        onSubmit={(labels: any[]): void => {
                            taskInstance.labels = labels.map((labelData): any => new core.classes.Label(labelData));
                            onUpdateTask(taskInstance);
                        }}
                    />
                </Col>
            </Row>
        );
    }

    private renderSubsetField(): JSX.Element {
        const { subset } = this.state;
        const { task: taskInstance, project, onUpdateTask } = this.props;

        return (
            <Row>
                <Col span={24}>
                    <Text className='cvat-text-color'>Subset:</Text>
                </Col>
                <Col span={24}>
                    <ProjectSubsetField
                        value={subset}
                        projectId={taskInstance.projectId as number}
                        projectSubsets={project?.subsets ?? null}
                        onChange={(value) => {
                            this.setState({ subset: value });

                            if (taskInstance.subset !== value) {
                                taskInstance.subset = value;
                                onUpdateTask(taskInstance);
                            }
                        }}
                    />
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const {
            activeInference,
            task: taskInstance,
            cancelAutoAnnotation,
            onUpdateTask,
        } = this.props;

        return (
            <div className='cvat-task-details'>
                <Row justify='start' align='middle'>
                    <Col className='cvat-task-details-task-name'>{this.renderTaskName()}</Col>
                </Row>
                <Row justify='space-between' align='top'>
                    <Col md={8} lg={7} xl={7} xxl={6}>
                        <Row justify='start' align='middle'>
                            <Col span={24}>
                                <Preview
                                    task={taskInstance}
                                    loadingClassName='cvat-task-item-loading-preview'
                                    emptyPreviewClassName='cvat-task-item-empty-preview'
                                    previewClassName='cvat-task-item-preview'
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col md={16} lg={17} xl={17} xxl={18}>
                        {this.renderDescription()}
                        { taskInstance.projectId === null && <MdGuideControl instanceType='task' id={taskInstance.id} /> }
                        <Row justify='space-between' align='middle'>
                            <Col span={12}>
                                <BugTrackerEditor
                                    instance={taskInstance}
                                    onChange={(bugTracker) => {
                                        taskInstance.bugTracker = bugTracker;
                                        onUpdateTask(taskInstance);
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
                        {!taskInstance.projectId && this.renderLabelsEditor()}
                        {taskInstance.projectId && this.renderSubsetField()}
                    </Col>
                </Row>
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DetailsComponent);
