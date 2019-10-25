import React from 'react';

import {
    Col,
    Row,
    Pagination,
} from 'antd';

import TaskItem from '../../containers/tasks-page/task-item';

export interface ContentListProps {
    onSwitchPage(page: number): void;
    currentTasksIndexes: number[];
    currentPage: number;
    numberOfTasks: number;
}

export default function TaskListComponent(props: ContentListProps) {
    const tasks = props.currentTasksIndexes;
    const taskViews = tasks.map(
        (tid, id) => <TaskItem idx={id} taskID={tid} key={tid}/>
    );

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
                        onChange={props.onSwitchPage}
                        total={props.numberOfTasks}
                        pageSize={10}
                        current={props.currentPage}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    )
}
