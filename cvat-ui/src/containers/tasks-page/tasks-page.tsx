// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    Task,
    TasksQuery,
    CombinedState,
} from 'reducers/interfaces';

import TasksPageComponent from 'components/tasks-page/tasks-page';

import {
    getTasksAsync,
    hideEmptyTasks,
} from 'actions/tasks-actions';

interface StateToProps {
    tasksFetching: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    numberOfHiddenTasks: number;
}

interface DispatchToProps {
    onGetTasks: (gettingQuery: TasksQuery) => void;
    hideEmptyTasks: (hideEmpty: boolean) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { tasks } = state;

    return {
        tasksFetching: state.tasks.fetching,
        gettingQuery: tasks.gettingQuery,
        numberOfTasks: state.tasks.count,
        numberOfVisibleTasks: state.tasks.current.length,
        numberOfHiddenTasks: tasks.hideEmpty ? tasks.current
            .filter((task: Task): boolean => !task.instance.jobs.length).length : 0,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onGetTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
        hideEmptyTasks: (hideEmpty: boolean): void => {
            dispatch(hideEmptyTasks(hideEmpty));
        },
    };
}

type TasksPageContainerProps = StateToProps & DispatchToProps;

function TasksPageContainer(props: TasksPageContainerProps): JSX.Element {
    return (
        <TasksPageComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksPageContainer);
