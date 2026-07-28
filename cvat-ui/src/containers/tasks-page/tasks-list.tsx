// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { TasksState, CombinedState } from 'reducers';
import TasksListComponent from 'components/tasks-page/task-list';

interface StateToProps {
    tasks: TasksState;
    deletedTasks: Record<number, boolean>;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        tasks: state.tasks,
        deletedTasks: state.tasks.activities.deletes,
    };
}

function TasksListContainer(props: Readonly<StateToProps>): JSX.Element {
    const { tasks, deletedTasks } = props;

    return (
        <TasksListComponent
            currentTasksIndexes={tasks.current.map((task): number => task.id)}
            deletedTasks={deletedTasks}
        />
    );
}

export default connect(mapStateToProps)(TasksListContainer);
