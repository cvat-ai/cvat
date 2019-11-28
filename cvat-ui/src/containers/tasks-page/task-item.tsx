import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
    CombinedState,
    ActiveInference,
} from '../../reducers/interfaces';

import TaskItemComponent from '../../components/tasks-page/task-item'

import {
    getTasksAsync,
} from '../../actions/tasks-actions';

interface StateToProps {
    deleteActivity: boolean | null;
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
        deleteActivity: deletes.byTask[id] ? deletes.byTask[id] : null,
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
    }
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItemContainer(props: TasksItemContainerProps) {
    return (
        <TaskItemComponent
            deleted={props.deleteActivity === true}
            taskInstance={props.taskInstance}
            previewImage={props.previewImage}
            activeInference={props.activeInference}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItemContainer);
