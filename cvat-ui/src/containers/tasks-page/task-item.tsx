import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
} from '../../reducers/interfaces';

import {
    CombinedState,
} from '../../reducers/root-reducer';

import TaskItemComponent from '../../components/tasks-page/task-item'

import {
    getTasksAsync,
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
} from '../../actions/tasks-actions';

interface StateToProps {
    dumpActivities: string[] | null;
    loadActivity: string | null;
    previewImage: string;
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
    dump: (task: any, format: string) => void;
    load: (task: any, format: string, file: File) => void;
}

interface OwnProps {
    idx: number;
    taskID: number;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const task = state.tasks.current[own.idx];
    const { formats } = state;
    const { dumps } = state.tasks.activities;
    const { loads } = state.tasks.activities;

    return {
        dumpActivities: dumps.byTask[own.taskID] ? dumps.byTask[own.taskID] : null,
        loadActivity: loads.byTask[own.taskID] ? loads.byTask[own.taskID] : null,
        previewImage: task.preview,
        taskInstance: task.instance,
        loaders: formats.loaders,
        dumpers: formats.dumpers,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
        dump: (task: any, dumper: any): void => {
            dispatch(dumpAnnotationsAsync(task, dumper));
        },
        load: (task: any, loader: any, file: File): void => {
            dispatch(loadAnnotationsAsync(task, loader, file));
        },
    }
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItemContainer(props: TasksItemContainerProps) {
    return (
        <TaskItemComponent
            taskInstance={props.taskInstance}
            previewImage={props.previewImage}
            dumpActivities={props.dumpActivities}
            loadActivity={props.loadActivity}
            loaders={props.loaders}
            dumpers={props.dumpers}
            onLoadAnnotation={props.load}
            onDumpAnnotation={props.dump}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItemContainer);
