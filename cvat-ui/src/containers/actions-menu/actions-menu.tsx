import React from 'react';
import { connect } from 'react-redux';

import ActionsMenuComponent from '../../components/actions-menu/actions-menu';
import {
    CombinedState,
    ActiveInference,
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
};

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
    const _exports = activities.exports;
    const { plugins } = state.plugins;
    const id = own.taskInstance.id;

    return {
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedTFSegmentation: plugins.TF_SEGMENTATION,
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        dumpActivities: dumps.byTask[id] ? dumps.byTask[id] : null,
        exportActivities: _exports.byTask[id] ? _exports.byTask[id] : null,
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
        onLoadAnnotation: (taskInstance: any, loader: any, file: File) => {
            dispatch(loadAnnotationsAsync(taskInstance, loader, file));
        },
        onDumpAnnotation: (taskInstance: any, dumper: any) => {
            dispatch(dumpAnnotationsAsync(taskInstance, dumper));
        },
        onExportDataset: (taskInstance: any, exporter: any) => {
            dispatch(exportDatasetAsync(taskInstance, exporter));
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
            exporters={props.exporters}
            loadActivity={props.loadActivity}
            dumpActivities={props.dumpActivities}
            exportActivities={props.exportActivities}
            installedTFAnnotation={props.installedTFAnnotation}
            installedTFSegmentation={props.installedTFSegmentation}
            installedAutoAnnotation={props.installedAutoAnnotation}
            onLoadAnnotation={props.onLoadAnnotation}
            onDumpAnnotation={props.onDumpAnnotation}
            onExportDataset={props.onExportDataset}
            onDeleteTask={props.onDeleteTask}
            onOpenRunWindow={props.onOpenRunWindow}
            inferenceIsActive={props.inferenceIsActive}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ActionsMenuContainer);
