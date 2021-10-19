// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import { CombinedState, TaskStatus } from 'reducers/interfaces';
import AnnotationMenuComponent, { Actions } from 'components/annotation-page/top-bar/annotation-menu';
import { updateJobAsync } from 'actions/tasks-actions';
import {
    uploadJobAnnotationsAsync,
    removeAnnotationsAsync,
    saveAnnotationsAsync,
    switchRequestReviewDialog as switchRequestReviewDialogAction,
    switchSubmitReviewDialog as switchSubmitReviewDialogAction,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    removeAnnotationsinRangeAsync as removeAnnotationsinRangeAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';

interface StateToProps {
    annotationFormats: any;
    jobInstance: any;
    stopFrame: any;
    loadActivity: string | null;
    user: any;
}

interface DispatchToProps {
    loadAnnotations(job: any, loader: any, file: File): void;
    showExportModal(task: any): void;
    removeAnnotations(sessionInstance: any): void;
    removeAnnotationinRangeAsync(sessionInstance: any, startnumber:number, endnumber:number, deltrack_keyframes_only:boolean): void;
    switchRequestReviewDialog(visible: boolean): void;
    switchSubmitReviewDialog(visible: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
    updateJob(jobInstance: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            activities: { loads: jobLoads },
            job: {
                instance: jobInstance,
                instance: { stopFrame },
            },
        },
        formats: { annotationFormats },
        tasks: {
            activities: { loads },
        },
        auth: { user },
    } = state;

    const taskID = jobInstance.task.id;
    const jobID = jobInstance.id;

    return {
        loadActivity: taskID in loads || jobID in jobLoads ? loads[taskID] || jobLoads[jobID] : null,
        jobInstance,
        stopFrame,
        annotationFormats,
        user,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadAnnotations(job: any, loader: any, file: File): void {
            dispatch(uploadJobAnnotationsAsync(job, loader, file));
        },
        showExportModal(task: any): void {
            dispatch(exportActions.openExportModal(task));
        },
        removeAnnotations(sessionInstance: any): void {
            dispatch(removeAnnotationsAsync(sessionInstance));
        },
        removeAnnotationinRangeAsync(sessionInstance:any, startnumber: number, endnumber: number, deltrack_keyframes_only:boolean){
            dispatch(removeAnnotationsinRangeAsyncAction(sessionInstance, startnumber, endnumber, deltrack_keyframes_only));
        },
        switchRequestReviewDialog(visible: boolean): void {
            dispatch(switchRequestReviewDialogAction(visible));
        },
        switchSubmitReviewDialog(visible: boolean): void {
            dispatch(switchSubmitReviewDialogAction(visible));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        saveAnnotations(jobInstance: any, afterSave?: () => void): void {
            dispatch(saveAnnotationsAsync(jobInstance, afterSave));
        },
        updateJob(jobInstance: any): void {
            dispatch(updateJobAsync(jobInstance));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

function AnnotationMenuContainer(props: Props): JSX.Element {
    const {
        jobInstance,
        stopFrame,
        user,
        annotationFormats: { loaders, dumpers },
        history,
        loadActivity,
        loadAnnotations,
        showExportModal,
        removeAnnotationinRangeAsync,
        removeAnnotations,
        switchRequestReviewDialog,
        switchSubmitReviewDialog,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
    } = props;

    const onUploadAnnotations = (format: string, file: File): void => {
        const [loader] = loaders.filter((_loader: any): boolean => _loader.name === format);
        if (loader && file) {
            loadAnnotations(jobInstance, loader, file);
        }
    };

    const onClickMenu = (params: MenuInfo): void => {
        const [action] = params.keyPath;
        if (action === Actions.EXPORT_TASK_DATASET) {
            showExportModal(jobInstance.task);
        } else if (action === Actions.REMOVE_ANNO) {
            removeAnnotations(jobInstance);
        } else if (action === Actions.REQUEST_REVIEW) {
            switchRequestReviewDialog(true);
        } else if (action === Actions.SUBMIT_REVIEW) {
            switchSubmitReviewDialog(true);
        } else if (action === Actions.RENEW_JOB) {
            jobInstance.status = TaskStatus.ANNOTATION;
            updateJob(jobInstance);
            history.push(`/tasks/${jobInstance.task.id}`);
        } else if (action === Actions.FINISH_JOB) {
            jobInstance.status = TaskStatus.COMPLETED;
            updateJob(jobInstance);
            history.push(`/tasks/${jobInstance.task.id}`);
        } else if (action === Actions.OPEN_TASK) {
            history.push(`/tasks/${jobInstance.task.id}`);
        }
    };

    const removeRange = (startFrame: number, endFrame: number, deltrack_keyframes_only:boolean) : void=>{
        removeAnnotationinRangeAsync(jobInstance, startFrame ,endFrame, deltrack_keyframes_only);
    }

    const isReviewer = jobInstance.reviewer?.id === user.id || user.isSuperuser;

    return (
        <AnnotationMenuComponent
            taskMode={jobInstance.task.mode}
            loaders={loaders}
            dumpers={dumpers}
            loadActivity={loadActivity}
            onUploadAnnotations={onUploadAnnotations}
            onClickMenu={onClickMenu}
            removeRange={removeRange}
            setForceExitAnnotationFlag={setForceExitAnnotationFlag}
            saveAnnotations={saveAnnotations}
            jobInstance={jobInstance}
            isReviewer={isReviewer}
            stopFrame= {stopFrame}
        />
    );
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationMenuContainer));
