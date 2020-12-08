
import React from 'react';
import { connect } from 'react-redux';

import {  Task, TasksQuery, CombinedState } from 'reducers/interfaces';

import PickedTaskListComponent from 'components/file-manager/picked-tasks';
import { getTasksAsync } from 'actions/tasks-actions';

interface StateToProps {
    tasks: Task[];
    fetching: boolean,
    updating: boolean,
    currentTasksIndexes: number[],
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}


function mapStateToProps(state: CombinedState): StateToProps {
    const { fetching, updating, current } = state.tasks;
    return {
        tasks: current,
        fetching,
        updating,
        currentTasksIndexes: current.map((task): number => task.instance.id),
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
    };
}


export default connect(mapStateToProps, mapDispatchToProps)(PickedTaskListComponent);
