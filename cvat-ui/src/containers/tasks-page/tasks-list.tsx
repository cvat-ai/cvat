import React from 'react';
import { connect } from 'react-redux';

import {
    TasksState,
    TasksQuery,
} from '../../reducers/interfaces';

import TasksListComponent from '../../components/tasks-page/task-list';

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    tasks: TasksState;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

interface OwnProps {
    onPageChange: (page: number) => void;
}

function mapStateToProps(state: any): StateToProps {
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
            onPageChange={props.onPageChange}
            tasks={props.tasks.array}
            page={props.tasks.query.page}
            count={props.tasks.count}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksListContainer);
