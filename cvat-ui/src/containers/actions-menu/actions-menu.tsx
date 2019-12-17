import React from 'react';
import { connect } from 'react-redux';

import ActionsMenuComponent from '../../components/actions-menu/actions-menu';
import {
    CombinedState,
} from '../../reducers/interfaces';

import { showRunModelDialog } from '../../actions/models-actions';
import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    exportDatasetAsync,
    deleteTaskAsync,
} from '../../actions/tasks-actions';

interface OwnProps {
    taskInstance: any;
}

interface StateToProps {
    loaders: any[];
    dumpers: any[];
    exporters: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    exportActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedAutoAnnotation: boolean;
    inferenceIsActive: boolean;
}

interface DispatchToProps {
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (taskInstance: any, dumper: any) => void;
    onExportDataset: (taskInstance: any, exporter: any) => void;
    onDeleteTask: (taskInstance: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { formats } = state;
    const { activities } = state.tasks;
    const { dumps } = activities;
    const { loads } = activities;
    const activeExports = activities.exports;
    const { plugins } = state.plugins;
    const { id } = own.taskInstance;

    return {
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedTFSegmentation: plugins.TF_SEGMENTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        dumpActivities: dumps.byTask[id] ? dumps.byTask[id] : null,
        exportActivities: activeExports.byTask[id] ? activeExports.byTask[id] : null,
        loadActivity: loads.byTask[id] ? loads.byTask[id] : null,
        loaders: formats.annotationFormats
            .map((format: any): any[] => format.loaders).flat(),
        dumpers: formats.annotationFormats
            .map((format: any): any[] => format.dumpers).flat(),
        exporters: formats.datasetFormats,
        inferenceIsActive: id in state.models.inferences,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLoadAnnotation: (taskInstance: any, loader: any, file: File): void => {
            dispatch(loadAnnotationsAsync(taskInstance, loader, file));
        },
        onDumpAnnotation: (taskInstance: any, dumper: any): void => {
            dispatch(dumpAnnotationsAsync(taskInstance, dumper));
        },
        onExportDataset: (taskInstance: any, exporter: any): void => {
            dispatch(exportDatasetAsync(taskInstance, exporter));
        },
        onDeleteTask: (taskInstance: any): void => {
            dispatch(deleteTaskAsync(taskInstance));
        },
        onOpenRunWindow: (taskInstance: any): void => {
            dispatch(showRunModelDialog(taskInstance));
        },
    };
}

function ActionsMenuContainer(props: OwnProps & StateToProps & DispatchToProps): JSX.Element {
    return (
        <ActionsMenuComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ActionsMenuContainer);
