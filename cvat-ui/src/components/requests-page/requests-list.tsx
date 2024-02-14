// Copyright (C) 2024 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import TaskItem from 'containers/tasks-page/task-item';

import dimensions from '../projects-page/dimensions';

export interface Props {
    currentTasksIndexes: number[];
}

function RequestsList(props: Props): JSX.Element {
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
