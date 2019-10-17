import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
} from '../../reducers/interfaces';
import { CombinedState } from '../../reducers/root-reducer';

import TasksPageComponent from '../../components/tasks-page/tasks-page';

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    dumpError: any;
    tasksAreBeingFetched: boolean;
    tasksFetchingError: any;
    tasksQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        dumpError: state.tasks.dumpError,
        tasksAreBeingFetched: !state.tasks.initialized,
        tasksFetchingError: state.tasks.error,
        tasksQuery: state.tasks.query,
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
            dumpError={props.dumpError}
            tasksAreBeingFetched={props.tasksAreBeingFetched}
            tasksFetchingError={props.tasksFetchingError}
            tasksQuery={props.tasksQuery}
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
