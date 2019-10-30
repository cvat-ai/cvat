import React from 'react';
import { connect } from 'react-redux';

import { getTaskAsync } from '../../actions/task-actions';

import TaskPageComponent from '../../components/task-page/task-page';
import { CombinedState } from '../../reducers/root-reducer';

interface StateToProps {
    taskFetchingError: any;
    taskUpdatingError: any;
    taskInstance: any;
    deleteActivity: boolean | null;
    installedGit: boolean;
}

interface DispatchToProps {
    fetchTask: (tid: number) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const { activeTask } = state;
    const { deletes } = state.tasks.activities;

    const taskInstance = activeTask.task ? activeTask.task.instance : null;

    let deleteActivity = null;
    if (taskInstance) {
        const { id } = taskInstance;
        deleteActivity = deletes.byTask[id] ? deletes.byTask[id] : null;
    }

    return {
        taskInstance,
        taskFetchingError: activeTask.taskFetchingError,
        taskUpdatingError: activeTask.taskUpdatingError,
        deleteActivity,
        installedGit: plugins.GIT_INTEGRATION,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        fetchTask: (tid: number) => {
            dispatch(getTaskAsync(tid));
        },
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <TaskPageComponent
            taskInstance={props.taskInstance}
            taskFetchingError={props.taskFetchingError ? props.taskFetchingError.toString() : ''}
            taskUpdatingError={props.taskUpdatingError ? props.taskUpdatingError.toString() : ''}
            deleteActivity={props.deleteActivity}
            installedGit={props.installedGit}
            onFetchTask={props.fetchTask}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);