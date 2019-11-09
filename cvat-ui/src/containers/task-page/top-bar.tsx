import React from 'react';
import { connect } from 'react-redux';

import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

import TopBarComponent from '../../components/task-page/top-bar';
import { CombinedState } from '../../reducers/root-reducer';

interface StateToProps {
    taskInstance: any;
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

function mapStateToProps(state: CombinedState): StateToProps {
    const taskInstance = (state.activeTask.task as any).instance;

    const { plugins } = state.plugins;
    const { formats } = state;
    const { dumps } = state.tasks.activities;
    const { loads } = state.tasks.activities;

    const { id } = taskInstance;
    const dumpActivities = dumps.byTask[id] ? dumps.byTask[id] : null;
    const loadActivity = loads.byTask[id] ? loads.byTask[id] : null;

    return {
        taskInstance,
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

function TaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <TopBarComponent
            taskInstance={props.taskInstance}
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