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
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        tasks: state.tasks,
    };
}

function TasksListContainer(props: StateToProps): JSX.Element {
    const { tasks } = props;

    return (
        <TasksListComponent
            currentTasksIndexes={tasks.current.map((task): number => task.id)}
        />
    );
}

export default connect(mapStateToProps)(TasksListContainer);
