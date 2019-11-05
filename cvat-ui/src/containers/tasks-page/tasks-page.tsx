import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
} from '../../reducers/interfaces';
import { CombinedState } from '../../reducers/root-reducer';

import TasksPageComponent from '../../components/tasks-page/tasks-page';

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    deletingError: any;
    dumpingError: any;
    loadingError: any;
    tasksFetchingError: any;
    loadingDoneMessage: string;
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
    const { activities } = tasks;
    const { dumps } = activities;
    const { loads } = activities;
    const { deletes } = activities;

    return {
        deletingError: deletes.deletingError,
        dumpingError: dumps.dumpingError,
        loadingError: loads.loadingError,
        tasksFetchingError: tasks.tasksFetchingError,
        loadingDoneMessage: loads.loadingDoneMessage,
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
            deletingError={props.deletingError ? props.deletingError.toString() : ''}
            dumpingError={props.dumpingError ? props.dumpingError.toString() : ''}
            loadingError={props.loadingError ? props.loadingError.toString() : ''}
            tasksFetchingError={props.tasksFetchingError ? props.tasksFetchingError.toString(): ''}
            loadingDoneMessage={props.loadingDoneMessage}
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
