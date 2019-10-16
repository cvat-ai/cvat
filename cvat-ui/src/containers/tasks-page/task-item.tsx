import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
} from '../../reducers/interfaces';

import TaskItemComponent from '../../components/tasks-page/task-item'

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    task: any;
    preview: any;
    loaders: any[];
    dumpers: any[];
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

interface OwnProps {
    idx: number;
}

function mapStateToProps(state: any, own: OwnProps): StateToProps {
    return {
        task: state.tasks.array[own.idx],
        preview: state.tasks.previews[own.idx],
        loaders: state.annotation.loaders,
        dumpers: state.annotation.dumpers,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery) => {dispatch(getTasksAsync(query))}
    }
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItem(props: TasksItemContainerProps) {
    return (
        <TaskItemComponent
            preview={props.preview}
            task={props.task}
            loaders={props.loaders}
            dumpers={props.dumpers}
            onLoadAnnotation={() => {}}
            onDumpAnnotation={() => {}}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItem);
