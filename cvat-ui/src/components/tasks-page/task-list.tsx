import React from 'react';

import {
    Col,
    Row,
    Pagination,
} from 'antd';

import TaskItem from './task-item'

export interface ContentListProps {
    goToPage(page: number): void;
    tasks: any[];
    page: number;
    count: number;
}

export default class TaskList extends React.PureComponent<ContentListProps> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const taskViews = [];

        for (const task of this.props.tasks) {
            taskViews.push(
                <TaskItem key={task.id} task={task}></TaskItem>
            )
        }

        return (
            <>
                <Row type='flex' justify='center' align='middle'>
                    <Col className='cvat-task-list' md={22} lg={18} xl={16} xxl={14}>
                        { taskViews }
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <Pagination
                            className='cvat-tasks-pagination'
                            current={this.props.page}
                            onChange={this.props.goToPage}
                            total={this.props.count}
                            pageSize={20}
                            showQuickJumper
                        />
                    </Col>
                </Row>
            </>
        )
    }
}
