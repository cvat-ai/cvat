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

export default class TaskList extends React.PureComponent<ContentListProps> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const taskViews = [];

        for (let i = 0; i < this.props.tasks.length; i++) {
            const task = this.props.tasks[i];
            const preview = this.props.previews[i];
            taskViews.push(
                <TaskItem key={task.id} task={task} preview={preview}></TaskItem>
            )
        }
        for (const task of this.props.tasks) {

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
                            onChange={this.props.goToPage}
                            total={this.props.count}
                            pageSize={10}
                            showQuickJumper
                        />
                    </Col>
                </Row>
            </>
        )
    }
}
