import React from 'react';
import { connect } from 'react-redux';

import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

import TopBarComponent from '../../components/task-page/top-bar';
import { CombinedState } from '../../reducers/root-reducer';
import { Task } from '../../reducers/interfaces';

interface OwnProps {
    task: Task;
}

interface StateToProps {
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedAutoAnnotation: boolean;
}

interface DispatchToProps {
    deleteTask: (taskInstance: any) => void;
    dumpAnnotations: (task: any, format: string) => void;
    loadAnnotations: (task: any, format: string, file: File) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { plugins } = state.plugins;
    const { formats } = state;
    const { dumps } = state.tasks.activities;
    const { loads } = state.tasks.activities;

    const { id } = own.task.instance;
    const dumpActivities = dumps.byTask[id] ? dumps.byTask[id] : null;
    const loadActivity = loads.byTask[id] ? loads.byTask[id] : null;

    return {
        loaders: formats.loaders,
        dumpers: formats.dumpers,
        dumpActivities,
        loadActivity,
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        deleteTask: (taskInstance: any): void => {
            dispatch(deleteTaskAsync(taskInstance));
        },
        dumpAnnotations: (task: any, dumper: any): void => {
            dispatch(dumpAnnotationsAsync(task, dumper));
        },
        loadAnnotations: (task: any, loader: any, file: File): void => {
            dispatch(loadAnnotationsAsync(task, loader, file));
        },
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps & OwnProps) {
    return (
        <TopBarComponent
            taskInstance={props.task.instance}
            loaders={props.loaders}
            dumpers={props.dumpers}
            loadActivity={props.loadActivity}
            dumpActivities={props.dumpActivities}
            installedTFAnnotation={props.installedTFAnnotation}
            installedAutoAnnotation={props.installedAutoAnnotation}
            onDeleteTask={props.deleteTask}
            onDumpAnnotation={props.dumpAnnotations}
            onLoadAnnotation={props.loadAnnotations}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);