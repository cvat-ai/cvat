import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
    SupportedPlugins,
} from '../../reducers/interfaces';

import {
    CombinedState,
} from '../../reducers/root-reducer';

import TaskItemComponent from '../../components/tasks-page/task-item'

import {
    getTasksAsync,
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

interface StateToProps {
    installedTFAnnotation: boolean;
    installedAutoAnnotation: boolean;
    dumpActivities: string[] | null;
    loadActivity: string | null;
    deleteActivity: boolean | null;
    previewImage: string;
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
    delete: (taskInstance: any) => void;
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
    const { deletes } = state.tasks.activities;
    const { plugins } = state.plugins;
    const id = own.taskID;

    return {
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        dumpActivities: dumps.byTask[id] ? dumps.byTask[id] : null,
        loadActivity: loads.byTask[id] ? loads.byTask[id] : null,
        deleteActivity: deletes.byTask[id] ? deletes.byTask[id] : null,
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
        delete: (taskInstance: any): void => {
            dispatch(deleteTaskAsync(taskInstance));
        },
    }
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItemContainer(props: TasksItemContainerProps) {
    return (
        <TaskItemComponent
            installedTFAnnotation={props.installedTFAnnotation}
            installedAutoAnnotation={props.installedAutoAnnotation}
            deleted={props.deleteActivity === true}
            taskInstance={props.taskInstance}
            previewImage={props.previewImage}
            dumpActivities={props.dumpActivities}
            loadActivity={props.loadActivity}
            loaders={props.loaders}
            dumpers={props.dumpers}
            onDeleteTask={props.delete}
            onLoadAnnotation={props.load}
            onDumpAnnotation={props.dump}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItemContainer);
