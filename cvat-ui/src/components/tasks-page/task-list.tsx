// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import TaskItem from 'containers/tasks-page/task-item';

import dimensions from 'utils/dimensions';

export interface Props {
    currentTasksIndexes: number[];
}

function TaskListComponent(props: Props): JSX.Element {
    const { currentTasksIndexes } = props;
    const taskViews = currentTasksIndexes.map((tid, id): JSX.Element => <TaskItem idx={id} taskID={tid} key={tid} />);

    return (
        <>
            <Row justify='center' align='middle'>
                <Col className='cvat-tasks-list' {...dimensions}>
                    {taskViews}
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal />
        </>
    );
}

export default React.memo(TaskListComponent, (prev: Props, cur: Props) => (
    prev.currentTasksIndexes.length !== cur.currentTasksIndexes.length || prev.currentTasksIndexes
        .some((val: number, idx: number) => val !== cur.currentTasksIndexes[idx])
));
