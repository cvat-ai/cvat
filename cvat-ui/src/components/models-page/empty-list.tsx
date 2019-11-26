import React from 'react';

import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Icon,
} from 'antd';

export default function EmptyListComponent() {
    const emptyTasksIcon = () => (<img src='/assets/empty-tasks-icon.svg'/>);

    return (
        <div className='cvat-empty-models-list'>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Icon className='cvat-empty-models-icon' component={emptyTasksIcon}/>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text strong>{'No models uploaded yet ...'}</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text type='secondary'>{'To annotate your tasks automatically'}</Text>
                </Col>
            </Row>
            <Row  type='flex' justify='center' align='middle'>
                <Col>
                    <Link to='/models/create'>{'upload a new model'}</Link>
                </Col>
            </Row>
        </div>

    )
}