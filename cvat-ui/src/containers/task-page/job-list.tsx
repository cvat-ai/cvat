import React from 'react';
import { connect } from 'react-redux';

import { getTaskAsync } from '../../actions/task-actions';
import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

import JobListComponent from '../../components/task-page/job-list';
import { CombinedState } from '../../reducers/root-reducer';

interface StateToProps {
    taskFetchingError: any;
    previewImage: string;
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    deleteActivity: boolean | null;
    installedTFAnnotation: boolean;
    installedAutoAnnotation: boolean;
    installedGit: boolean;
}

interface DispatchToProps {
    fetchTask: (tid: number) => void;
    deleteTask: (taskInstance: any) => void;
    dumpAnnotations: (task: any, format: string) => void;
    loadAnnotations: (task: any, format: string, file: File) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const { formats } = state;
    const { activeTask } = state;
    const { dumps } = state.tasks.activities;
    const { loads } = state.tasks.activities;
    const { deletes } = state.tasks.activities;

    const taskInstance = activeTask.task ? activeTask.task.instance : null;
    const previewImage = activeTask.task ? activeTask.task.preview : '';

    let dumpActivities = null;
    let loadActivity = null;
    let deleteActivity = null;
    if (taskInstance) {
        const { id } = taskInstance;
        dumpActivities = dumps.byTask[id] ? dumps.byTask[id] : null;
        loadActivity = loads.byTask[id] ? loads.byTask[id] : null;
        deleteActivity = deletes.byTask[id] ? deletes.byTask[id] : null;
    }

    return {
        previewImage,
        taskInstance,
        taskFetchingError: activeTask.taskFetchingError,
        loaders: formats.loaders,
        dumpers: formats.dumpers,
        dumpActivities,
        loadActivity,
        deleteActivity,
        installedGit: plugins.GIT_INTEGRATION,
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        fetchTask: (tid: number) => {
            dispatch(getTaskAsync(tid));
        },
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
        <JobListComponent
            taskInstance={props.taskInstance}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);