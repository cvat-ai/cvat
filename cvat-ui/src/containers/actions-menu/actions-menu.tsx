import React from 'react';
import { connect } from 'react-redux';

import ActionsMenuComponent from '../../components/actions-menu/actions-menu';
import { CombinedState } from '../../reducers/interfaces';
import { showRunModelDialog } from '../../actions/models-actions';
import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

interface OwnProps {
    taskInstance: any;
}

interface StateToProps {
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedAutoAnnotation: boolean;
};

interface DispatchToProps {
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (taskInstance: any, dumper: any) => void;
    onDeleteTask: (taskInstance: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { formats } = state;
    const { dumps } = state.tasks.activities;
    const { loads } = state.tasks.activities;
    const { plugins } = state.plugins;
    const id = own.taskInstance.id;

    return {
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedTFSegmentation: plugins.TF_SEGMENTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        dumpActivities: dumps.byTask[id] ? dumps.byTask[id] : null,
        loadActivity: loads.byTask[id] ? loads.byTask[id] : null,
        loaders: formats.loaders,
        dumpers: formats.dumpers,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLoadAnnotation: (taskInstance: any, loader: any, file: File) => {
            dispatch(loadAnnotationsAsync(taskInstance, loader, file));
        },
        onDumpAnnotation: (taskInstance: any, dumper: any) => {
            dispatch(dumpAnnotationsAsync(taskInstance, dumper));
        },
        onDeleteTask: (taskInstance: any) => {
            dispatch(deleteTaskAsync(taskInstance));
        },
        onOpenRunWindow: (taskInstance: any) => {
            dispatch(showRunModelDialog(taskInstance));
        }
    };
}

function ActionsMenuContainer(props: OwnProps & StateToProps & DispatchToProps) {
    return (
        <ActionsMenuComponent
            taskInstance={props.taskInstance}
            loaders={props.loaders}
            dumpers={props.dumpers}
            loadActivity={props.loadActivity}
            dumpActivities={props.dumpActivities}
            installedTFAnnotation={props.installedTFAnnotation}
            installedTFSegmentation={props.installedTFSegmentation}
            installedAutoAnnotation={props.installedAutoAnnotation}
            onLoadAnnotation={props.onLoadAnnotation}
            onDumpAnnotation={props.onDumpAnnotation}
            onDeleteTask={props.onDeleteTask}
            onOpenRunWindow={props.onOpenRunWindow}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ActionsMenuContainer);
