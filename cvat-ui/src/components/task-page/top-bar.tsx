import React from 'react';

import {
    Row,
    Col,
    Button,
    Dropdown,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ActionsMenuContainer from '../../containers/actions-menu/actions-menu';

interface DetailsComponentProps {
    taskInstance: any;
}

export default function DetailsComponent(props: DetailsComponentProps) {
    const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);

    const { id } = props.taskInstance;

    return (
        <Row className='cvat-task-top-bar' type='flex' justify='space-between' align='middle'>
            <Col>
                <Text className='cvat-title'>{`Task details #${id}`}</Text>
            </Col>
            <Col>
                <Dropdown overlay={
                    <ActionsMenuContainer
                        taskInstance={props.taskInstance}
                    />
                }>
                    <Button size='large' className='cvat-flex cvat-flex-center'>
                        <Text className='cvat-black-color'>Actions</Text>
                        <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                    </Button>
                </Dropdown>
            </Col>
        </Row>
    );
}