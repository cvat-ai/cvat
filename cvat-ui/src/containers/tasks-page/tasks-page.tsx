import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
    CombinedState
} from '../../reducers/interfaces';

import TasksPageComponent from '../../components/tasks-page/tasks-page';

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    tasksAreBeingFetched: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
}

interface DispatchToProps {
    getTasks: (gettingQuery: TasksQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { tasks } = state;

    return {
        tasksAreBeingFetched: !state.tasks.initialized,
        gettingQuery: tasks.gettingQuery,
        numberOfTasks: state.tasks.count,
        numberOfVisibleTasks: state.tasks.current.length,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery) => {dispatch(getTasksAsync(query))}
    }
}

type TasksPageContainerProps = StateToProps & DispatchToProps;

function TasksPageContainer(props: TasksPageContainerProps) {
    return (
        <TasksPageComponent
            tasksAreBeingFetched={props.tasksAreBeingFetched}
            gettingQuery={props.gettingQuery}
            numberOfTasks={props.numberOfTasks}
            numberOfVisibleTasks={props.numberOfVisibleTasks}
            onGetTasks={props.getTasks}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksPageContainer);
