import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import moment from 'moment';

import LabelsEditorComponent from '../labels-editor/labels-editor';
import getCore from '../../core';

const core = getCore();

interface Props {
    previewImage: string;
    taskInstance: any;
    installedGit: boolean; // change to git repos url
    onTaskUpdate: (taskInstance: any) => void;
}

interface State {
    name: string;
}

export default class DetailsComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            name: props.taskInstance.name,
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

        return (
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={12}>
                    { owner ? <Text type='secondary'>
                        Created by {owner} on {created}
                    </Text> : null }
                </Col>
                <Col span={10}>
                    { assignee ? <Text type='secondary'>
                        Assigned to {assignee}
                    </Text> : <Text type='secondary'>
                        Not assigned to anyone
                    </Text>
                    }
                </Col>
            </Row>
        );
    }

    private renderBugTracker() {
        const { taskInstance } = this.props;
        const { bugTracker } = taskInstance;

        if (bugTracker) {
            return (
                <Row>
                    <Col>
                        <Text strong className='cvat-black-color'> Bug Tracker </Text>
                        <br/>
                        <a href={bugTracker}>{bugTracker}</a>
                    </Col>
                </Row>
            );
        } else {
            return null;
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
