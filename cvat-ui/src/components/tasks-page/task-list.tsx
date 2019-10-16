import React from 'react';

import {
    Col,
    Row,
    Pagination,
} from 'antd';

import TaskItemComponent from '../../containers/tasks-page/task-item';

export interface ContentListProps {
    onPageChange(page: number): void;
    tasks: any[];
    page: number;
    count: number;
}

export default function TaskList(props: ContentListProps) {
    const taskViews = [];

    for (let i = 0; i < props.tasks.length; i++) {
        const task = props.tasks[i];
        taskViews.push(
            <TaskItemComponent idx={i} key={task.id}/>
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
                        onChange={props.onPageChange}
                        total={props.count}
                        pageSize={10}
                        current={props.page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    )
}
