import React from 'react';

import {
    Col,
    Row,
} from 'antd';

export interface TaskItemProps {
    task: any;
}

export default class TaskItem extends React.PureComponent<TaskItemProps> {
    render() {
        return (
            <Row className='task-list-item' type='flex' justify='center' align='middle'>
                <Col>
                    {this.props.task.name}
                </Col>
            </Row>
        )
    }
}
