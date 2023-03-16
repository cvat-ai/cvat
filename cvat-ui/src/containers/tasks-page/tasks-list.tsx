// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { TasksState, TasksQuery, CombinedState } from 'reducers';
import TasksListComponent from 'components/tasks-page/task-list';
import { getTasksAsync } from 'actions/tasks-actions';

interface StateToProps {
    tasks: TasksState;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        tasks: state.tasks,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
    };
}

type TasksListContainerProps = StateToProps & DispatchToProps;

function TasksListContainer(props: TasksListContainerProps): JSX.Element {
    const { tasks } = props;

    return (
        <TasksListComponent
            currentTasksIndexes={tasks.current.map((task): number => task.id)}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(TasksListContainer);
