// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import ActionsMenuComponent, { Actions } from 'components/actions-menu/actions-menu';
import {
    CombinedState,
} from 'reducers/interfaces';

import { modelsActions } from 'actions/models-actions';
import {
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
    exportDatasetAsync,
    deleteTaskAsync,
} from 'actions/tasks-actions';
import { ClickParam } from 'antd/lib/menu';

interface OwnProps {
    taskInstance: any;
}

interface StateToProps {
    annotationFormats: any[];
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
    loadAnnotations: (taskInstance: any, loader: any, file: File) => void;
    dumpAnnotations: (taskInstance: any, dumper: any) => void;
    exportDataset: (taskInstance: any, exporter: any) => void;
    deleteTask: (taskInstance: any) => void;
    openRunModelWindow: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        taskInstance: {
            id: tid,
        },
    } = own;

    const {
        formats: {
            annotationFormats,
            datasetFormats,
        },
        plugins: {
            list: {
                TF_ANNOTATION: installedTFAnnotation,
                TF_SEGMENTATION: installedTFSegmentation,
                AUTO_ANNOTATION: installedAutoAnnotation,
            },
        },
        tasks: {
            activities: {
                dumps,
                loads,
                exports: activeExports,
            },
        },
    } = state;

    return {
        installedTFAnnotation,
        installedTFSegmentation,
        installedAutoAnnotation,
        dumpActivities: tid in dumps ? dumps[tid] : null,
        exportActivities: tid in activeExports ? activeExports[tid] : null,
        loadActivity: tid in loads ? loads[tid] : null,
        annotationFormats,
        exporters: datasetFormats,
        inferenceIsActive: tid in state.models.inferences,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadAnnotations: (taskInstance: any, loader: any, file: File): void => {
            dispatch(loadAnnotationsAsync(taskInstance, loader, file));
        },
        dumpAnnotations: (taskInstance: any, dumper: any): void => {
            dispatch(dumpAnnotationsAsync(taskInstance, dumper));
        },
        exportDataset: (taskInstance: any, exporter: any): void => {
            dispatch(exportDatasetAsync(taskInstance, exporter));
        },
        deleteTask: (taskInstance: any): void => {
            dispatch(deleteTaskAsync(taskInstance));
        },
        openRunModelWindow: (taskInstance: any): void => {
            dispatch(modelsActions.showRunModelDialog(taskInstance));
        },
    };
}

function ActionsMenuContainer(props: OwnProps & StateToProps & DispatchToProps): JSX.Element {
    const {
        taskInstance,
        annotationFormats,
        exporters,
        loadActivity,
        dumpActivities,
        exportActivities,
        inferenceIsActive,
        installedAutoAnnotation,
        installedTFAnnotation,
        installedTFSegmentation,

        loadAnnotations,
        dumpAnnotations,
        exportDataset,
        deleteTask,
        openRunModelWindow,
    } = props;


    const loaders = annotationFormats
        .map((format: any): any[] => format.loaders).flat();

    const dumpers = annotationFormats
        .map((format: any): any[] => format.dumpers).flat();

    function onClickMenu(params: ClickParam, file?: File): void {
        if (params.keyPath.length > 1) {
            const [additionalKey, action] = params.keyPath;
            if (action === Actions.DUMP_TASK_ANNO) {
                const format = additionalKey;
                const [dumper] = dumpers
                    .filter((_dumper: any): boolean => _dumper.name === format);
                if (dumper) {
                    dumpAnnotations(taskInstance, dumper);
                }
            } else if (action === Actions.LOAD_TASK_ANNO) {
                const [format] = additionalKey.split('::');
                const [loader] = loaders
                    .filter((_loader: any): boolean => _loader.name === format);
                if (loader && file) {
                    loadAnnotations(taskInstance, loader, file);
                }
            } else if (action === Actions.EXPORT_TASK_DATASET) {
                const format = additionalKey;
                const [exporter] = exporters
                    .filter((_exporter: any): boolean => _exporter.name === format);
                if (exporter) {
                    exportDataset(taskInstance, exporter);
                }
            }
        } else {
            const [action] = params.keyPath;
            if (action === Actions.DELETE_TASK) {
                deleteTask(taskInstance);
            } else if (action === Actions.OPEN_BUG_TRACKER) {
                // eslint-disable-next-line
                window.open(`${taskInstance.bugTracker}`, '_blank');
            } else if (action === Actions.RUN_AUTO_ANNOTATION) {
                openRunModelWindow(taskInstance);
            }
        }
    }

    return (
        <ActionsMenuComponent
            taskID={taskInstance.id}
            taskMode={taskInstance.mode}
            bugTracker={taskInstance.bugTracker}
            loaders={loaders.map((loader: any): string => `${loader.name}::${loader.format}`)}
            dumpers={dumpers.map((dumper: any): string => dumper.name)}
            exporters={exporters.map((exporter: any): string => exporter.name)}
            loadActivity={loadActivity}
            dumpActivities={dumpActivities}
            exportActivities={exportActivities}
            inferenceIsActive={inferenceIsActive}
            installedAutoAnnotation={installedAutoAnnotation}
            installedTFAnnotation={installedTFAnnotation}
            installedTFSegmentation={installedTFSegmentation}
            onClickMenu={onClickMenu}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ActionsMenuContainer);
