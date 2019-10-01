import React from 'react';

import { Link, withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Icon,
    Input,
} from 'antd';

export default class ModelsPage extends React.PureComponent {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const emptyTasksIcon = () => (<img src='/assets/empty-tasks-icon.svg'/>);

        return (
            <div className='empty-task-list'>
                <Row type='flex' justify='center' align='middle'>
                    <Col>
                        <Icon className='empty-tasks-icon' component={emptyTasksIcon}/>
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col>
                        <Text strong> No tasks created yet ... </Text>
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col>
                        <Text type='secondary'> To get started with your annotation project </Text>
                    </Col>
                </Row>
                <Row  type='flex' justify='center' align='middle'>
                    <Col>
                        <Link to='/tasks/create'> create new task </Link>
                    </Col>
                </Row>
            </div>

        )
    }
}