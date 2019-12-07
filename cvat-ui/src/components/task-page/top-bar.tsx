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

export default function DetailsComponent(props: DetailsComponentProps): JSX.Element {
    const subMenuIcon = (): JSX.Element => (<img alt='' src='/assets/icon-sub-menu.svg' />);

    const { taskInstance } = props;
    const { id } = taskInstance;

    return (
        <Row className='cvat-task-top-bar' type='flex' justify='space-between' align='middle'>
            <Col>
                <Text className='cvat-title'>{`Task details #${id}`}</Text>
            </Col>
            <Col>
                <Dropdown overlay={
                    (
                        <ActionsMenuContainer
                            taskInstance={taskInstance}
                        />
                    )}
                >
                    <Button size='large' className='cvat-flex cvat-flex-center'>
                        <Text className='cvat-black-color'>Actions</Text>
                        <Icon className='cvat-task-item-menu-icon' component={subMenuIcon} />
                    </Button>
                </Dropdown>
            </Col>
        </Row>
    );
}
