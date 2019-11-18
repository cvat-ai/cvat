import React from 'react';

import {
    Row,
    Col,
    Button,
    Dropdown,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ActionsMenu from '../actions-menu/actions-menu';

interface DetailsComponentProps {
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedAutoAnnotation: boolean;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (task: any, dumper: any) => void;
    onDeleteTask: (task: any) => void;
}

export default function DetailsComponent(props: DetailsComponentProps) {
    const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);
    const { id } = props.taskInstance;

    return (
        <Row className='cvat-task-top-bar' type='flex' justify='space-between' align='middle'>
            <Col>
                <Text className='cvat-title'> Task details #{id} </Text>
            </Col>
            <Col>
                <Dropdown overlay={
                        ActionsMenu({
                            taskInstance: props.taskInstance,
                            loaders: props.loaders,
                            dumpers: props.dumpers,
                            loadActivity: props.loadActivity,
                            dumpActivities: props.dumpActivities,
                            installedTFAnnotation: props.installedTFAnnotation,
                            installedAutoAnnotation: props.installedAutoAnnotation,
                            onLoadAnnotation: props.onLoadAnnotation,
                            onDumpAnnotation: props.onDumpAnnotation,
                            onDeleteTask: props.onDeleteTask,
                        })
                    }>
                    <Button size='large' className='cvat-flex cvat-flex-center'>
                        <Text className='cvat-black-color'> Actions </Text>
                        <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                    </Button>
                </Dropdown>
            </Col>
        </Row>
    );
}