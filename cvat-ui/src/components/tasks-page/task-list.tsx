// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import TaskItem from 'containers/tasks-page/task-item';
import dimensions from 'utils/dimensions';
import BulkWrapper from '../bulk-wrapper';

export interface Props {
    currentTasksIndexes: number[];
}

function TaskListComponent(props: Props): JSX.Element {
    const { currentTasksIndexes } = props;

    return (
        <>
            <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
                <Col className='cvat-tasks-list' {...dimensions}>
                    <BulkWrapper
                        currentResourceIDs={currentTasksIndexes}
                    >
                        {(selectProps) => (
                            currentTasksIndexes.map((tid: number, idx: number) => (
                                <TaskItem
                                    key={tid}
                                    idx={idx}
                                    taskID={tid}
                                    {...selectProps(tid, idx)}
                                />
                            ))
                        )}
                    </BulkWrapper>
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal />
        </>
    );
}

export default React.memo(TaskListComponent);
