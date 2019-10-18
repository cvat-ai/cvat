import React from 'react';
import { connect } from 'react-redux';

import {
    TasksState,
    TasksQuery,
} from '../../reducers/interfaces';

import {
    CombinedState,
} from '../../reducers/root-reducer';

import TasksListComponent from '../../components/tasks-page/task-list';

import {
    getTasksAsync,
} from '../../actions/tasks-actions';

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
        getTasks: (query: TasksQuery) => {dispatch(getTasksAsync(query))}
    }
}

type TasksListContainerProps = StateToProps & DispatchToProps & OwnProps;

function TasksListContainer(props: TasksListContainerProps) {
    return (
        <TasksListComponent
            onSwitchPage={props.onSwitchPage}
            currentTasksIndexes={props.tasks.current.map((task) => task.instance.id)}
            currentPage={props.tasks.gettingQuery.page}
            numberOfTasks={props.tasks.count}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksListContainer);
