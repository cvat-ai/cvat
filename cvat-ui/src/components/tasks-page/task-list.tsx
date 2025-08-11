// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import TaskItem from 'containers/tasks-page/task-item';
import dimensions from 'utils/dimensions';
import { SelectedResourceType } from 'reducers';
import BulkWrapper from '../bulk-wrapper';

export interface Props {
    currentTasksIndexes: number[];
    deletedTasks: Record<number, boolean>;
}

function TaskListComponent(props: Readonly<Props>): JSX.Element {
    const { currentTasksIndexes, deletedTasks } = props;

    const selectableTaskIds = currentTasksIndexes.filter((id) => !deletedTasks[id]);
    const selectableTaskIdToIndex = new Map<number, number>();
    selectableTaskIds.forEach((id, idx) => selectableTaskIdToIndex.set(id, idx));

    return (
        <>
            <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
                <Col className='cvat-tasks-list' {...dimensions}>
                    <BulkWrapper
                        currentResourceIds={selectableTaskIds}
                        resourceType={SelectedResourceType.TASKS}
                    >
                        {(selectProps) => currentTasksIndexes.map((tid: number, idx: number) => {
                            const isDeleting = deletedTasks[tid];
                            const selectableIndex = isDeleting ?
                                -1 :
                                selectableTaskIdToIndex.get(tid) ?? -1;
                            const canSelect = !isDeleting && selectableIndex !== -1;

                            const taskProps = canSelect ?
                                selectProps(tid, selectableIndex) :
                                { selected: false, onClick: () => false };

                            return (
                                <TaskItem
                                    key={tid}
                                    idx={idx}
                                    taskID={tid}
                                    {...taskProps}
                                />
                            );
                        })}
                    </BulkWrapper>
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal />
        </>
    );
}

export default React.memo(TaskListComponent);
