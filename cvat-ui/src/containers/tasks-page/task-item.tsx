import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
    CombinedState,
    ActiveInference,
} from '../../reducers/interfaces';

import TaskItemComponent from '../../components/tasks-page/task-item';

import {
    getTasksAsync,
} from '../../actions/tasks-actions';

interface StateToProps {
    deleted: boolean;
    hidden: boolean;
    previewImage: string;
    taskInstance: any;
    activeInference: ActiveInference | null;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

interface OwnProps {
    idx: number;
    taskID: number;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const task = state.tasks.current[own.idx];
    const { deletes } = state.tasks.activities;
    const id = own.taskID;

    return {
        hidden: state.tasks.hideEmpty && task.instance.jobs.length === 0,
        deleted: deletes.byTask[id] ? deletes.byTask[id] === true : false,
        previewImage: task.preview,
        taskInstance: task.instance,
        activeInference: state.models.inferences[id] || null,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
    };
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItemContainer(props: TasksItemContainerProps): JSX.Element {
    return (
        <TaskItemComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItemContainer);
