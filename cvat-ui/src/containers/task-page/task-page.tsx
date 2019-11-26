import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';

import { getTasksAsync } from '../../actions/tasks-actions';

import TaskPageComponent from '../../components/task-page/task-page';
import {
    Task,
    CombinedState,
} from '../../reducers/interfaces';

type Props = RouteComponentProps<{id: string}>;

interface StateToProps {
    task: Task;
    taskFetchingError: any;
    taskUpdatingError: any;
    taskDeletingError: any;
    deleteActivity: boolean | null;
    installedGit: boolean;
}

interface DispatchToProps {
    fetchTask: (tid: number) => void;
}

function mapStateToProps(state: CombinedState, own: Props): StateToProps {
    const { plugins } = state.plugins;
    const { deletes } = state.tasks.activities;
    const taskDeletingError = deletes.deletingError;
    const id = +own.match.params.id;

    const filtered = state.tasks.current.filter((task) => task.instance.id === id);
    const task = filtered[0] || null;

    let deleteActivity = null;
    if (task && id in deletes.byTask) {
        deleteActivity = deletes.byTask[id];
    }

    return {
        task,
        taskFetchingError: state.tasks.tasksFetchingError,
        taskUpdatingError: state.tasks.taskUpdatingError,
        taskDeletingError,
        deleteActivity,
        installedGit: plugins.GIT_INTEGRATION,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        fetchTask: (tid: number) => {
            dispatch(getTasksAsync({
                id: tid,
                page: 1,
                search: null,
                owner: null,
                assignee: null,
                name: null,
                status: null,
                mode: null,
            }));
        },
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <TaskPageComponent
            task={props.task}
            taskDeletingError={props.taskDeletingError ? props.taskDeletingError.toString() : ''}
            taskFetchingError={props.taskFetchingError ? props.taskFetchingError.toString() : ''}
            taskUpdatingError={props.taskUpdatingError ? props.taskUpdatingError.toString() : ''}
            deleteActivity={props.deleteActivity}
            installedGit={props.installedGit}
            onFetchTask={props.fetchTask}
        />
    );
}

export default withRouter(connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer));
