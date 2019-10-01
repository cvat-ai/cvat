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

import EmptyTasksPage from './empty-page';

export default class TasksPage extends React.PureComponent {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const TasksPage = EmptyTasksPage;
        return (
            <div className='task-page'>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <Text strong> Default project </Text>
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={11} lg={9} xl={8} xxl={7}>
                        <Text className='cvat-title'> Tasks </Text>
                        <Input.Search size='large' placeholder='Search'/>
                    </Col>
                    <Col
                        md={{span: 11, push: 2}}
                        lg={{span: 9, push: 2}}
                        xl={{span: 8, push: 2}}
                        xxl={{span: 7, push: 3}}>
                        <Button size='large' id='create-task-button' type='primary' onClick={
                            () => window.open('/tasks/create', '_blank')
                        }> Create new task </Button>
                    </Col>
                </Row>
                <TasksPage/>
            </div>
        )
    }
}