// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    TasksState,
    TasksQuery,
    CombinedState,
} from 'reducers/interfaces';

import TasksListComponent from 'components/tasks-page/task-list';

import {
    getTasksAsync,
} from 'actions/tasks-actions';

interface StateToProps {
    tasks: TasksState;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

interface OwnProps {
    onSwitchPage: (page: number) => void;
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

type TasksListContainerProps = StateToProps & DispatchToProps & OwnProps;

function TasksListContainer(props: TasksListContainerProps): JSX.Element {
    const {
        tasks,
        onSwitchPage,
    } = props;

    return (
        <TasksListComponent
            onSwitchPage={onSwitchPage}
            currentTasksIndexes={tasks.current.map((task): number => task.instance.id)}
            currentPage={tasks.gettingQuery.page}
            numberOfTasks={tasks.count}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksListContainer);
