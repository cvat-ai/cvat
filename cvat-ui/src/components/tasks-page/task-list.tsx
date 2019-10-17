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
    previews: string[];
    page: number;
    count: number;
}

export default function TaskList(props: ContentListProps) {
    const taskViews = [];

    for (let i = 0; i < props.tasks.length; i++) {
        const task = props.tasks[i];
        const preview = props.previews[i];
        taskViews.push(
            <TaskItem key={task.id} task={task} preview={preview}></TaskItem>
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
                        onChange={props.goToPage}
                        total={props.count}
                        pageSize={10}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    )
}
