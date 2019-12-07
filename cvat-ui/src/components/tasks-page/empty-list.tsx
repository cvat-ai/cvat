import React from 'react';

import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Icon,
} from 'antd';

export default function EmptyListComponent(): JSX.Element {
    const emptyTasksIcon = (): JSX.Element => (<img alt='' src='/assets/empty-tasks-icon.svg' />);

    return (
        <div className='cvat-empty-task-list'>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Icon className='cvat-empty-tasks-icon' component={emptyTasksIcon} />
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text strong>No tasks created yet ...</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text type='secondary'>To get started with your annotation project</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Link to='/tasks/create'>create a new task</Link>
                </Col>
            </Row>
        </div>
    );
}
