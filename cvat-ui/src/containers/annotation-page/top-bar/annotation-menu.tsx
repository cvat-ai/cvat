// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { ClickParam } from 'antd/lib/menu/index';

import { CombinedState } from 'reducers/interfaces';
import AnnotationMenuComponent, { Actions } from 'components/annotation-page/top-bar/annotation-menu';

import {
    dumpAnnotationsAsync,
    exportDatasetAsync,
} from 'actions/tasks-actions';

import {
    uploadJobAnnotationsAsync,
    removeAnnotationsAsync,
} from 'actions/annotation-actions';

interface StateToProps {
    annotationFormats: any[];
    exporters: any[];
    jobInstance: any;
    loadActivity: string | null;
    dumpActivities: string[] | null;
    exportActivities: string[] | null;
}

interface DispatchToProps {
    loadAnnotations(job: any, loader: any, file: File): void;
    dumpAnnotations(task: any, dumper: any): void;
    exportDataset(task: any, exporter: any): void;
    removeAnnotations(sessionInstance: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            activities: {
                loads: jobLoads,
            },
            job: {
                instance: jobInstance,
            },
        },
        formats: {
            annotationFormats,
            datasetFormats: exporters,
        },
        tasks: {
            activities: {
                dumps,
                loads,
                exports: activeExports,
            },
        },
    } = state;

    const taskID = jobInstance.task.id;
    const jobID = jobInstance.id;

    return {
        dumpActivities: taskID in dumps ? dumps[taskID] : null,
        exportActivities: taskID in activeExports ? activeExports[taskID] : null,
        loadActivity: taskID in loads || jobID in jobLoads
            ? loads[taskID] || jobLoads[jobID] : null,
        jobInstance,
        annotationFormats,
        exporters,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadAnnotations(job: any, loader: any, file: File): void {
            dispatch(uploadJobAnnotationsAsync(job, loader, file));
        },
        dumpAnnotations(task: any, dumper: any): void {
            dispatch(dumpAnnotationsAsync(task, dumper));
        },
        exportDataset(task: any, exporter: any): void {
            dispatch(exportDatasetAsync(task, exporter));
        },
        removeAnnotations(sessionInstance: any): void {
            dispatch(removeAnnotationsAsync(sessionInstance));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

function AnnotationMenuContainer(props: Props): JSX.Element {
    const {
        jobInstance,
        annotationFormats,
        exporters,
        loadAnnotations,
        dumpAnnotations,
        exportDataset,
        removeAnnotations,
        history,
        loadActivity,
        dumpActivities,
        exportActivities,
    } = props;

    const loaders = annotationFormats
        .map((format: any): any[] => format.loaders).flat();

    const dumpers = annotationFormats
        .map((format: any): any[] => format.dumpers).flat();

    const onClickMenu = (params: ClickParam, file?: File): void => {
        if (params.keyPath.length > 1) {
            const [additionalKey, action] = params.keyPath;
            if (action === Actions.DUMP_TASK_ANNO) {
                const format = additionalKey;
                const [dumper] = dumpers
                    .filter((_dumper: any): boolean => _dumper.name === format);
                if (dumper) {
                    dumpAnnotations(jobInstance.task, dumper);
                }
            } else if (action === Actions.LOAD_JOB_ANNO) {
                const [format] = additionalKey.split('::');
                const [loader] = loaders
                    .filter((_loader: any): boolean => _loader.name === format);
                if (loader && file) {
                    loadAnnotations(jobInstance, loader, file);
                }
            } else if (action === Actions.EXPORT_TASK_DATASET) {
                const format = additionalKey;
                const [exporter] = exporters
                    .filter((_exporter: any): boolean => _exporter.name === format);
                if (exporter) {
                    exportDataset(jobInstance.task, exporter);
                }
            }
        } else {
            const [action] = params.keyPath;
            if (action === Actions.REMOVE_ANNO) {
                removeAnnotations(jobInstance);
            } else if (action === Actions.OPEN_TASK) {
                history.push(`/tasks/${jobInstance.task.id}`);
            }
        }
    };

    return (
        <AnnotationMenuComponent
            taskMode={jobInstance.task.mode}
            loaders={loaders.map((loader: any): string => loader.name)}
            dumpers={dumpers.map((dumper: any): string => dumper.name)}
            exporters={exporters.map((exporter: any): string => exporter.name)}
            loadActivity={loadActivity}
            dumpActivities={dumpActivities}
            exportActivities={exportActivities}
            onClickMenu={onClickMenu}
        />
    );
}

export default withRouter(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    )(AnnotationMenuContainer),
);
