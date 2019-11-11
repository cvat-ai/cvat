import React from 'react';

import {
    Row,
    Col,
    Modal,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import moment from 'moment';

import UserSelector from './user-selector';
import LabelsEditorComponent from '../labels-editor/labels-editor';
import getCore from '../../core';
import patterns from '../../utils/validation-patterns';

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
}

export default class DetailsComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        const { taskInstance } = props;

        this.state = {
            name: taskInstance.name,
            bugTracker: taskInstance.bugTracker,
        };
    }

    private renderTaskName() {
        const { taskInstance } = this.props;
        const { name } = this.state;
        return (
            <Title
                level={4}
                editable={{
                    onChange: (value: string) => {
                        this.setState({
                            name: value,
                        });

                        taskInstance.name = value;
                        this.props.onTaskUpdate(taskInstance);
                    },
                }}
                className='cvat-black-color'
            >{name}</Title>
        );
    }

    private renderPreview() {
        return (
            <div className='cvat-task-preview-wrapper'>
                <img alt='Preview' className='cvat-task-preview' src={this.props.previewImage}/>
            </div>
        );
    }

    private renderParameters() {
        const { taskInstance } = this.props;
        const { overlap } = taskInstance;
        const { segmentSize } = taskInstance;
        const { imageQuality } = taskInstance;
        const zOrder = taskInstance.zOrder.toString();

        return (
            <>
                <Row type='flex' justify='start' align='middle'>
                    <Col span={12}>
                        <Text strong className='cvat-black-color'> Overlap size </Text>
                        <br/>
                        <Text className='cvat-black-color'>{overlap}</Text>
                    </Col>
                    <Col span={12}>
                        <Text strong className='cvat-black-color'> Segment size </Text>
                        <br/>
                        <Text className='cvat-black-color'>{segmentSize}</Text>
                    </Col>
                </Row>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={12}>
                        <Text strong className='cvat-black-color'> Image quality </Text>
                        <br/>
                        <Text className='cvat-black-color'>{imageQuality}</Text>
                    </Col>
                    <Col span={12}>
                        <Text strong className='cvat-black-color'> Z-order </Text>
                        <br/>
                        <Text className='cvat-black-color'>{zOrder}</Text>
                    </Col>
                </Row>
            </>
        );
    }

    private renderUsers() {
        const { taskInstance } = this.props;
        const owner = taskInstance.owner ? taskInstance.owner.username : null;
        const assignee = taskInstance.assignee ? taskInstance.assignee.username : null;
        const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');
        const assigneeSelect = <UserSelector
            users={this.props.registeredUsers}
            value={assignee}
            onChange={
                (value: string) => {
                    let [userInstance] = this.props.registeredUsers
                        .filter((user: any) => user.username === value);

                    if (userInstance === undefined) {
                        userInstance = null;
                    }

                    taskInstance.assignee = userInstance;
                    this.props.onTaskUpdate(taskInstance);
                }
            }
        />

        return (
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={12}>
                    { owner ? <Text type='secondary'>
                        Created by {owner} on {created}
                    </Text> : null }
                </Col>
                <Col span={10}>
                    <Text type='secondary'>
                        {'Assigned to'}
                        { assigneeSelect }
                    </Text>
                </Col>
            </Row>
        );
    }

    private renderBugTracker() {
        const { taskInstance } = this.props;
        const { bugTracker } = this.state;

        const onChangeValue = (value: string) => {
            if (value && !patterns.validateURL.pattern.test(value)) {
                Modal.error({
                    title: `Could not update the task ${taskInstance.id}`,
                    content: 'Issue tracker is expected to be URL',
                });
            } else {
                this.setState({
                    bugTracker: value,
                });

                taskInstance.bugTracker = value;
                this.props.onTaskUpdate(taskInstance);
            }
        }

        if (bugTracker) {
            return (
                <Row>
                    <Col>
                        <Text strong className='cvat-black-color'> Issue Tracker </Text>
                        <br/>
                        <Text editable={{onChange: onChangeValue}}>{bugTracker}</Text>
                        <Button type='ghost' size='small' onClick={() => {
                            window.open(bugTracker, '_blank');
                        }} className='cvat-open-bug-tracker-button'>{'Open the issue'}</Button>
                    </Col>
                </Row>
            );
        } else {
            return (
                <Row>
                    <Col>
                        <Text strong className='cvat-black-color'> Issue Tracker </Text>
                        <br/>
                        <Text editable={{onChange: onChangeValue}}>{'Not specified'}</Text>
                    </Col>
                </Row>
            );
        }
    }

    private renderLabelsEditor() {
        const { taskInstance } = this.props;

        return (
            <Row>
                <Col>
                    <LabelsEditorComponent
                        labels={taskInstance.labels.map(
                            (label: any) => label.toJSON()
                        )}
                        onSubmit={(labels: any[]) => {
                            taskInstance.labels = labels.map((labelData) => {
                                return new core.classes.Label(labelData);
                            });

                            this.props.onTaskUpdate(taskInstance);
                        }}
                    />
                </Col>
            </Row>
        );
    }

    public componentDidUpdate(prevProps: Props) {
        if (prevProps !== this.props) {
            this.setState({
                name: this.props.taskInstance.name,
                bugTracker: this.props.taskInstance.bugTracker,
            });
        }
    }

    public render() {
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
                        { this.renderLabelsEditor() }
                    </Col>
                </Row>
            </div>
        );
    }
}
