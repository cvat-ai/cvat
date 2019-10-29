import React from 'react';

import {
    Row,
    Col,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import moment from 'moment';

import LabelsEditorComponent from '../labels-editor/labels-editor';

interface DetailsComponentProps {
    previewImage: string;
    taskInstance: any;
    installedGit: boolean;
}

export default function DetailsComponent(props: DetailsComponentProps) {
    const { taskInstance } = props;
    const { name } = taskInstance;
    const { overlap } = taskInstance;
    const { segmentSize } = taskInstance;
    const { imageQuality } = taskInstance;
    const { bugTracker } = taskInstance;
    const owner = taskInstance.owner ? taskInstance.owner.username : null;
    const assignee = taskInstance.assignee ? taskInstance.assignee.username : null;
    const created = moment(taskInstance.createdDate).format('MMMM Do YYYY');
    const zOrder = taskInstance.zOrder.toString();

    return (
        <div className='cvat-task-details'>
            <Row type='flex' justify='start' align='middle'>
                <Col>
                    <Title level={4} className='cvat-black-color'> {name} </Title>
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='top'>
                <Col md={8} lg={7} xl={7} xxl={6}>
                    <Row type='flex' justify='start' align='middle'>
                        <Col span={24}>
                            <div className='cvat-task-preview-wrapper'>
                                <img alt='Preview' className='cvat-task-preview' src={props.previewImage}/>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Row type='flex' justify='start' align='middle'>
                                <Col span={12}>
                                    <Text strong className='cvat-black-color'> Overlap size </Text>
                                    <br/>
                                    <Text className='cvat-black-color'> {overlap} </Text>
                                </Col>
                                <Col span={12}>
                                    <Text strong className='cvat-black-color'> Segment size </Text>
                                    <br/>
                                    <Text className='cvat-black-color'> {segmentSize} </Text>
                                </Col>
                            </Row>
                            <Row type='flex' justify='space-between' align='middle'>
                                <Col span={12}>
                                    <Text strong className='cvat-black-color'> Image quality </Text>
                                    <br/>
                                    <Text className='cvat-black-color'> {imageQuality} </Text>
                                </Col>
                                <Col span={12}>
                                    <Text strong className='cvat-black-color'> Z-order </Text>
                                    <br/>
                                    <Text className='cvat-black-color'> {zOrder} </Text>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
                <Col md={16} lg={17} xl={17} xxl={18}>
                    <Row type='flex' justify='space-between' align='middle'>
                        <Col span={12}>
                            { owner ? <Text type='secondary'>
                                Created by {owner} on {created}
                            </Text> : null }
                        </Col>
                        <Col span={10}>
                            { assignee ? <Text type='secondary'>
                                Assigned to {assignee}
                            </Text> : null }
                        </Col>
                    </Row>
                    { bugTracker ?
                        <Row>
                            <Col>
                                <Text strong className='cvat-black-color'> Bug Tracker </Text>
                                <br/>
                                <a href={bugTracker}> {bugTracker} </a>
                            </Col>
                        </Row> : null
                    }
                    <Row>
                        <Col>
                            <Text strong className='cvat-black-color'> Labels </Text>
                            <br/>
                            <LabelsEditorComponent
                                labels={taskInstance.labels.map(
                                    (label: any) => label.toJSON()
                                )}
                                onSubmit={(labels: any[]) => {
                                    console.log(labels);
                                }}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}
